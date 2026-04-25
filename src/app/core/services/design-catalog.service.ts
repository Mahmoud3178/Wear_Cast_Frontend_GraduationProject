import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { WEARCAST_SIZE_ENUM_STRINGS } from './factory-api.service';

const CATALOG_IDS_KEY = 'wearcast:designedProductCatalogIds';

/** Metadata the designer uses for POST /api/customers/me/designs + UI */
export interface WearcastCatalogMeta {
  designedProductId: number;
  colorIdsBySlug: Record<string, number>;
  /** CSS hex per color slug (from API `hexCode`) */
  colorHexBySlug: Record<string, string>;
  /** Human color name per slug (e.g. "Black") */
  colorLabelBySlug: Record<string, string>;
}

export interface CatalogSizeRow {
  label: string;
  a: number;
  b: number;
  c: number;
}

/** Shape expected by `public/designer/designer.js` bootstrap. */
export interface DesignerBootstrap {
  products: Record<
    string,
    {
      title: string;
      width: number;
      height: number;
      images: () => Record<string, Record<string, string>>;
      wearcastCatalog?: WearcastCatalogMeta;
      /** Base price from catalog (number). */
      price?: number;
      description?: string;
      sizes?: CatalogSizeRow[];
      /** Resolved category image for product details modal */
      categoryImageUrl?: string;
      /** Category display name (e.g. for image alt text) */
      categoryName?: string;
      /** Used to load category image when the catalog omits it */
      categoryId?: number;
    }
  >;
  colors: string[];
}

@Injectable({ providedIn: 'root' })
export class DesignCatalogService {
  private readonly base = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  /** Call after a factory publishes a designed product. */
  registerDesignedProductId(id: number): void {
    const raw = localStorage.getItem(CATALOG_IDS_KEY);
    let ids: number[] = [];
    try {
      ids = raw ? (JSON.parse(raw) as number[]) : [];
    } catch {
      ids = [];
    }
    if (!ids.includes(id)) {
      ids.push(id);
    }
    localStorage.setItem(CATALOG_IDS_KEY, JSON.stringify(ids));
  }

  getRegisteredIds(): number[] {
    try {
      const raw = localStorage.getItem(CATALOG_IDS_KEY);
      return raw ? (JSON.parse(raw) as number[]) : [];
    } catch {
      return [];
    }
  }

  /**
   * Load one designed product for display/editing.
   * Uses catalog GET (factory `GET /api/factories/products/{id}` often returns 405).
   * Tries Bearer auth first, then anonymous GET if the catalog allows public read.
   */
  fetchDesignedProductDto(
    id: number,
    token: string | null
  ): Observable<Record<string, unknown> | null> {
    const url = `${this.base}/api/catalog/designed-products/${id}`;
    const get$ = (auth: string | null) =>
      this.http
        .get<unknown>(url, auth ? { headers: { Authorization: `Bearer ${auth}` } } : {})
        .pipe(
          map(raw => unwrapCatalogPayload(raw)),
          catchError(() => of(null))
        );
    return get$(token).pipe(
      switchMap(dto => (dto ? of(dto) : token ? get$(null) : of(null)))
    );
  }

  /** Remove an id after the product was deleted on the server or unregistered locally. */
  unregisterDesignedProductId(id: number): void {
    const next = this.getRegisteredIds().filter(x => x !== id);
    localStorage.setItem(CATALOG_IDS_KEY, JSON.stringify(next));
  }

  /**
   * Load catalog details and build designer PRODUCTS + color slug list.
   * Falls back to empty (static designer defaults) when unauthenticated or on errors.
   */
  loadDesignerBootstrap(
    token: string | null,
    options?: { extraProductIds?: number[] }
  ): Observable<DesignerBootstrap> {
    const extra = options?.extraProductIds ?? [];
    const extraOnly = [...new Set(extra.filter(n => Number.isFinite(n) && n > 0))];
    if (!token) {
      return of({ products: {}, colors: [] });
    }
    return this.discoverCatalogIdsFromServer(token, extraOnly).pipe(
      switchMap(ids => {
        if (!ids.length) {
          return of({ products: {}, colors: [] });
        }
        const reqs = ids.map(id =>
          this.http
            .get<unknown>(`${this.base}/api/catalog/designed-products/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            .pipe(catchError(() => of(null)))
        );
        return forkJoin(reqs).pipe(
          tap(responses => {
            responses.forEach((dto, i) => {
              if (!dto) {
                this.unregisterDesignedProductId(ids[i]);
              }
            });
          }),
          map(responses => ({ responses, ids }))
        );
      }),
      switchMap(responses => {
        const rows = 'responses' in responses ? responses.responses : [];
        const ids = 'ids' in responses ? responses.ids : [];
        const boot = this.mapResponsesToBootstrap(rows, ids);
        type P = DesignerBootstrap['products'][string] & {
          categoryId?: number;
          categoryImageUrl?: string;
          categoryName?: string;
        };
        const needCategory: number[] = [];
        Object.values(boot.products).forEach(prod => {
          const p = prod as P;
          if (p.categoryId && p.categoryId > 0 && !p.categoryImageUrl) {
            needCategory.push(p.categoryId);
          }
        });
        const uniq = [...new Set(needCategory)];
        if (!uniq.length) {
          return of(boot);
        }
        const catReqs = uniq.map(cid =>
          this.http
            .get<unknown>(`${this.base}/api/Category/GetCategoryById/${cid}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            .pipe(catchError(() => of(null)))
        );
        return forkJoin(catReqs).pipe(
          map(catBodies => {
            const idToMeta: Record<
              number,
              { url?: string; name?: string }
            > = {};
            uniq.forEach((cid, i) => {
              const body = catBodies[i];
              let root: unknown = body;
              if (Array.isArray(body) && body[0] && typeof body[0] === 'object') {
                root = body[0];
              }
              const payload =
                unwrapCatalogPayload(root) ??
                (root && typeof root === 'object' && !Array.isArray(root)
                  ? (root as Record<string, unknown>)
                  : null);
              if (!payload) {
                return;
              }
              const rawImg = extractCategoryImageFromDto(payload);
              const url = rawImg ? this.resolveMediaUrl(rawImg) : undefined;
              const name =
                pickString(payload, ['name', 'Name', 'title', 'Title']) ||
                undefined;
              idToMeta[cid] = { url, name };
            });
            Object.values(boot.products).forEach(prod => {
              const p = prod as P;
              const m = p.categoryId ? idToMeta[p.categoryId] : undefined;
              if (m?.url && !p.categoryImageUrl) {
                p.categoryImageUrl = m.url;
              }
              if (m?.name && !p.categoryName) {
                p.categoryName = m.name;
              }
            });
            return boot;
          })
        );
      })
    );
  }

  private discoverCatalogIdsFromServer(
    token: string,
    extraProductIds: number[]
  ): Observable<number[]> {
    const url = `${this.base}/api/customer/catalog/designed-products`;
    return this.http
      .get<unknown>(url, { headers: { Authorization: `Bearer ${token}` } })
      .pipe(
        map(body => {
          const ids = extractDesignedProductIdsFromList(body);
          if (ids.length > 0) {
            localStorage.setItem(CATALOG_IDS_KEY, JSON.stringify(ids));
            return [...new Set([...ids, ...extraProductIds])];
          }
          if (isEmptyDesignedProductListBody(body)) {
            localStorage.setItem(CATALOG_IDS_KEY, JSON.stringify([]));
            return [...new Set(extraProductIds)];
          }
          return [...new Set(extraProductIds)];
        }),
        catchError(() => of([...new Set(extraProductIds)]))
      );
  }

  private mapResponsesToBootstrap(
    responses: unknown[],
    ids: number[]
  ): DesignerBootstrap {
    const products: DesignerBootstrap['products'] = {};
    const colorSet = new Set<string>();

    responses.forEach((dto, i) => {
      if (!dto || typeof dto !== 'object') {
        return;
      }
      const id = ids[i];
      const key = `p${id}`;
      const payload = unwrapCatalogPayload(dto);
      if (!payload) {
        return;
      }
      const mapped = this.mapOneProduct(payload, id);
      if (mapped) {
        products[key] = mapped.product;
        mapped.colors.forEach(c => colorSet.add(c));
      }
    });

    return { products, colors: Array.from(colorSet) };
  }

  private mapOneProduct(
    dto: Record<string, unknown>,
    id: number
  ): { product: DesignerBootstrap['products'][string]; colors: string[] } | null {
    const name =
      pickString(dto, [
        'name',
        'Name',
        'productName',
        'ProductName',
        'title',
        'Title'
      ]) || `Product ${id}`;
    const price =
      num(dto['price'] ?? dto['Price'] ?? dto['basePrice'] ?? dto['BasePrice']) ??
      undefined;
    const description =
      pickString(dto, ['description', 'Description']) || undefined;
    const merged = mergeNestedProductShape(dto);
    const sizeRows = mapProductSizes(merged);
    const categoryId = pickCategoryId(merged) ?? pickCategoryId(dto);
    const categoryName =
      pickString(dto, ['categoryName', 'CategoryName']) ||
      categoryNestedName(dto) ||
      categoryNestedName(merged) ||
      undefined;
    const categoryImageRaw =
      extractCategoryImageFromDto(dto) || extractCategoryImageFromDto(merged);
    const categoryImageUrl = categoryImageRaw
      ? this.resolveMediaUrl(categoryImageRaw)
      : undefined;
    const cw = num(dto['canvasWidth'] ?? dto['CanvasWidth']) ?? 400;
    const ch = num(dto['canvasHeight'] ?? dto['CanvasHeight']) ?? 480;

    // Read colors from top-level, nested product shapes, and generic "*color*" arrays.
    const rawColors = pickColorRowsArray(merged) ?? pickColorRowsArray(dto) ?? [];

    const bySlug: Record<string, Record<string, string>> = {};
    const slugs: string[] = [];
    const colorIdsBySlug: Record<string, number> = {};
    const colorHexBySlug: Record<string, string> = {};
    const colorLabelBySlug: Record<string, string> = {};

    rawColors.forEach((c, idx) => {
      if (!c || typeof c !== 'object') {
        return;
      }
      const co = c as Record<string, unknown>;
      const cid = num(co['id'] ?? co['Id']);
      const colorLabel = String(co['name'] ?? co['Name'] ?? `Color ${cid ?? idx}`);
      const slug =
        slugify(colorLabel) || `c${cid ?? idx}`;
      slugs.push(slug);
      colorLabelBySlug[slug] = colorLabel;
      const hexRaw = pickString(co, ['hexCode', 'HexCode', 'hex', 'Hex']);
      if (hexRaw) {
        const h = hexRaw.trim().startsWith('#') ? hexRaw.trim() : `#${hexRaw.trim()}`;
        colorHexBySlug[slug] = h;
      }
      bySlug[slug] = {
        front: '',
        back: '',
        right: '',
        left: ''
      };
      if (cid != null && cid > 0) {
        colorIdsBySlug[slug] = cid;
      }
      const imgs = pickColorImagesArray(co);
      let implicitSideIndex = 0;
      imgs.forEach(im => {
        if (!im || typeof im !== 'object') {
          return;
        }
        const io = im as Record<string, unknown>;
        const rawSide =
          io['viewSide'] ??
          io['ViewSide'] ??
          io['side'] ??
          io['Side'] ??
          io['view'] ??
          io['View'];
        let view = parseViewSide(rawSide);
        if (!view) {
          view = VIEW_KEYS[implicitSideIndex % 4];
          implicitSideIndex += 1;
        }
        const rawUrl = pickString(io, [
          'imageUrl',
          'ImageUrl',
          'url',
          'Url',
          'fileUrl',
          'FileUrl',
          'path',
          'Path'
        ]);
        const url = rawUrl ? this.resolveMediaUrl(rawUrl) : '';
        if (bySlug[slug] && url) {
          bySlug[slug][view] = url;
        }
      });
    });

    if (slugs.length === 0) {
      slugs.push('default');
      const fallback = categoryImageUrl || '';
      bySlug['default'] = {
        front: fallback,
        back: fallback,
        right: fallback,
        left: fallback
      };
    }

    const frozen = bySlug;
    const catalogMeta: WearcastCatalogMeta = {
      designedProductId: id,
      colorIdsBySlug,
      colorHexBySlug,
      colorLabelBySlug
    };
    return {
      product: {
        title: name,
        width: cw,
        height: ch,
        price,
        description,
        sizes: sizeRows.length ? sizeRows : undefined,
        categoryImageUrl,
        categoryName,
        categoryId,
        wearcastCatalog: catalogMeta,
        images() {
          return frozen;
        }
      },
      colors: slugs
    };
  }

  /** Turn API-relative paths into absolute URLs the `<img>` and canvas can load.
   *  In dev (apiUrl empty), absolute backend URLs are made relative so they
   *  route through the Angular dev-server proxy and avoid CORS.
   */
  private resolveMediaUrl(raw: string): string {
    const u = raw.trim();
    if (!u) {
      return '';
    }
    if (/^https?:\/\//i.test(u)) {
      if (!this.base) {
        // Dev mode: strip origin so images go through the proxy (same-origin)
        try {
          const urlObj = new URL(u);
          return urlObj.pathname + urlObj.search;
        } catch {
          return u;
        }
      }
      return u;
    }
    if (u.startsWith('//')) {
      return `${typeof window !== 'undefined' ? window.location.protocol : 'https:'}${u}`;
    }
    const base = this.base.replace(/\/$/, '');
    const path = u.startsWith('/') ? u : `/${u}`;
    return `${base}${path}`;
  }
}

/** API may return `{ isSuccess, data: { ... } }` or a bare DTO. */
function unwrapCatalogPayload(root: unknown): Record<string, unknown> | null {
  if (!root || typeof root !== 'object') {
    return null;
  }
  const o = root as Record<string, unknown>;
  if ('isSuccess' in o && o['isSuccess'] === false) {
    return null;
  }
  const inner = o['data'] ?? o['Data'];
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  return o;
}

const VIEW_KEYS = ['front', 'back', 'right', 'left'] as const;

/**
 * Backend uses 1-based ViewSide (Front=1 … Left=4). Older payloads may use 0–3.
 */
function viewSideToKey(side: number): (typeof VIEW_KEYS)[number] {
  if (side >= 1 && side <= 4) {
    return VIEW_KEYS[side - 1];
  }
  if (side >= 0 && side <= 3) {
    return VIEW_KEYS[side];
  }
  return 'front';
}

/** Parse API view side: number, numeric string, or enum name ("Front", "Right", …). */
function parseViewSide(raw: unknown): (typeof VIEW_KEYS)[number] | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return viewSideToKey(raw);
  }
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) {
      return null;
    }
    const n = num(s);
    if (n != null) {
      return viewSideToKey(n);
    }
    const norm = s.replace(/\s+/g, '').toLowerCase();
    const map: Record<string, (typeof VIEW_KEYS)[number]> = {
      front: 'front',
      back: 'back',
      right: 'right',
      left: 'left'
    };
    if (map[norm]) {
      return map[norm];
    }
  }
  return null;
}

/** Pull size arrays from DTO + common nested product shapes. */
function mergeNestedProductShape(dto: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...dto };
  const nestKeys = [
    'designedProduct',
    'DesignedProduct',
    'factoryProduct',
    'FactoryProduct',
    'product',
    'Product',
    'details',
    'Details'
  ];
  for (const k of nestKeys) {
    const v = dto[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const sub = v as Record<string, unknown>;
      for (const [sk, sv] of Object.entries(sub)) {
        if (out[sk] === undefined) {
          out[sk] = sv;
        }
      }
    }
  }
  return out;
}

function pickSizeRowsArray(dto: Record<string, unknown>): unknown[] {
  const keys = [
    'productSizes',
    'ProductSizes',
    'factoryProductSizes',
    'FactoryProductSizes',
    'designedProductSizes',
    'DesignedProductSizes',
    'sizes',
    'Sizes',
    'sizeRows',
    'SizeRows',
    'productSizeRows',
    'ProductSizeRows',
    'sizeDetails',
    'SizeDetails'
  ];
  for (const k of keys) {
    const v = dto[k];
    if (Array.isArray(v) && v.length) {
      return v;
    }
  }
  return [];
}

/** Broad color array picker for inconsistent API DTO names/shapes. */
function pickColorRowsArray(dto: Record<string, unknown>): unknown[] | null {
  const preferred = [
    'productColors',
    'ProductColors',
    'factoryProductColors',
    'FactoryProductColors',
    'designedProductColors',
    'DesignedProductColors',
    'colors',
    'Colors'
  ];
  for (const k of preferred) {
    const v = dto[k];
    if (Array.isArray(v) && v.length) {
      return v;
    }
  }
  // Fallback: any array field whose key contains "color".
  for (const [k, v] of Object.entries(dto)) {
    if (!/color/i.test(k) || !Array.isArray(v) || !v.length) {
      continue;
    }
    const row = v[0];
    if (row && typeof row === 'object') {
      return v;
    }
  }
  return null;
}

/** Image list under a color row with flexible field names. */
function pickColorImagesArray(colorDto: Record<string, unknown>): unknown[] {
  const keys = [
    'images',
    'Images',
    'productImages',
    'ProductImages',
    'productColorImages',
    'ProductColorImages',
    'designedProductImages',
    'DesignedProductImages'
  ];
  for (const k of keys) {
    const v = colorDto[k];
    if (Array.isArray(v)) {
      return v;
    }
  }
  for (const [k, v] of Object.entries(colorDto)) {
    if (!/image/i.test(k) || !Array.isArray(v)) {
      continue;
    }
    return v;
  }
  return [];
}

/** True when the list endpoint clearly returned an empty page (not a parse failure). */
function isEmptyDesignedProductListBody(body: unknown): boolean {
  if (Array.isArray(body)) {
    return body.length === 0;
  }
  if (!body || typeof body !== 'object') {
    return false;
  }
  const o = body as Record<string, unknown>;
  if (o['isSuccess'] === true && o['hasData'] === false) {
    return true;
  }
  const unwrap = (node: unknown): unknown[] | null => {
    if (Array.isArray(node)) {
      return node;
    }
    if (node && typeof node === 'object' && !Array.isArray(node)) {
      const n = node as Record<string, unknown>;
      const nested = n['items'] ?? n['Items'] ?? n['records'] ?? n['Records'];
      if (Array.isArray(nested)) {
        return nested;
      }
    }
    return null;
  };
  const top = o['data'] ?? o['Data'] ?? o['items'] ?? o['Items'];
  const arr = unwrap(top) ?? unwrap(o);
  return arr !== null && arr.length === 0;
}

/** Extract ids from GET /api/catalog/designed-products list shapes. */
function extractDesignedProductIdsFromList(body: unknown): number[] {
  let rows: unknown[] = [];
  if (Array.isArray(body)) {
    rows = body;
  } else if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>;
    let data: unknown =
      o['data'] ?? o['Data'] ?? o['items'] ?? o['Items'] ?? o['result'] ?? o['Result'];
    if (Array.isArray(data)) {
      rows = data;
    } else if (data && typeof data === 'object' && !Array.isArray(data)) {
      const inner = data as Record<string, unknown>;
      const nested =
        inner['items'] ??
        inner['Items'] ??
        inner['records'] ??
        inner['Records'] ??
        inner['data'] ??
        inner['Data'];
      if (Array.isArray(nested)) {
        rows = nested;
      }
    }
  }
  const ids = new Set<number>();
  rows.forEach(r => {
    if (!r || typeof r !== 'object') {
      return;
    }
    const o = r as Record<string, unknown>;
    const id = num(
      o['id'] ??
        o['Id'] ??
        o['designedProductId'] ??
        o['DesignedProductId'] ??
        o['productId'] ??
        o['ProductId']
    );
    if (id != null && id > 0) {
      ids.add(id);
    }
  });
  return Array.from(ids);
}

function sizeTokenToLabel(token: unknown): string {
  if (typeof token === 'string') {
    const t = token.trim();
    if (t) {
      return t.replace(/^_/, '');
    }
  }
  if (typeof token === 'number' && Number.isFinite(token)) {
    const n = Math.trunc(token);
    const arr = WEARCAST_SIZE_ENUM_STRINGS;
    if (n >= 0 && n < arr.length) {
      return arr[n].replace(/^_/, '');
    }
    if (n >= 1 && n <= arr.length) {
      return arr[n - 1].replace(/^_/, '');
    }
    return String(n);
  }
  return '';
}

function sizeLabelFromRow(o: Record<string, unknown>): string {
  const label = sizeTokenToLabel(
    o['size'] ??
      o['Size'] ??
      o['sizeName'] ??
      o['SizeName'] ??
      o['sizeLabel'] ??
      o['SizeLabel'] ??
      o['name'] ??
      o['Name'] ??
      o['label'] ??
      o['Label']
  );
  return label;
}

function pickMeasurements(
  o: Record<string, unknown>
): { a: number; b: number; c: number } | null {
  const groups: Array<[string, string, string]> = [
    ['a', 'b', 'c'],
    ['A', 'B', 'C'],
    ['measurementA', 'measurementB', 'measurementC'],
    ['MeasurementA', 'MeasurementB', 'MeasurementC'],
    ['lengthA', 'lengthB', 'lengthC'],
    ['LengthA', 'LengthB', 'LengthC'],
    ['dimensionA', 'dimensionB', 'dimensionC'],
    ['DimensionA', 'DimensionB', 'DimensionC']
  ];
  for (const [ka, kb, kc] of groups) {
    const a = num(o[ka]);
    const b = num(o[kb]);
    const c = num(o[kc]);
    if (a != null && b != null && c != null) {
      return { a, b, c };
    }
  }
  return null;
}

function categoryNestedName(dto: Record<string, unknown>): string {
  const cat = dto['category'] ?? dto['Category'];
  if (cat && typeof cat === 'object') {
    return pickString(cat as Record<string, unknown>, [
      'name',
      'Name',
      'title',
      'Title'
    ]);
  }
  return '';
}

/** Category id on product or nested `category` object from catalog DTOs. */
function pickCategoryId(dto: Record<string, unknown>): number | undefined {
  const top = num(dto['categoryId'] ?? dto['CategoryId']);
  if (top != null && top > 0) {
    return top;
  }
  const cat = dto['category'] ?? dto['Category'];
  if (cat && typeof cat === 'object') {
    const co = cat as Record<string, unknown>;
    const inner = num(co['id'] ?? co['Id'] ?? co['categoryId'] ?? co['CategoryId']);
    if (inner != null && inner > 0) {
      return inner;
    }
  }
  return undefined;
}

/**
 * Image path/URL from category GET or embedded category on designed product.
 * Matches common ASP.NET + multipart upload responses (string fields only).
 */
function extractCategoryImageFromDto(dto: Record<string, unknown>): string {
  const keys = [
    'categoryImageUrl',
    'CategoryImageUrl',
    'categoryImage',
    'CategoryImage',
    'categoryPictureUrl',
    'CategoryPictureUrl',
    'imageUrl',
    'ImageUrl',
    'image',
    'Image',
    'picture',
    'Picture',
    'pictureUrl',
    'PictureUrl',
    'photoUrl',
    'PhotoUrl',
    'thumbnailUrl',
    'ThumbnailUrl',
    'logoUrl',
    'LogoUrl',
    'fileUrl',
    'FileUrl',
    'imagePath',
    'ImagePath',
    'imageFilePath',
    'ImageFilePath',
    'imageFileName',
    'ImageFileName',
    'categoryImagePath',
    'CategoryImagePath',
    'path',
    'Path',
    'url',
    'Url'
  ];
  const fromRoot = pickString(dto, keys);
  if (fromRoot) {
    return fromRoot;
  }
  const cat = dto['category'] ?? dto['Category'];
  if (cat && typeof cat === 'object') {
    return pickString(cat as Record<string, unknown>, keys);
  }
  return '';
}

function mapProductSizes(dto: Record<string, unknown>): CatalogSizeRow[] {
  const raw = pickSizeRowsArray(dto);
  const out: CatalogSizeRow[] = [];
  raw.forEach((row, idx) => {
    if (!row || typeof row !== 'object') {
      return;
    }
    const o = row as Record<string, unknown>;
    let label = sizeLabelFromRow(o);
    if (!label) {
      label = 'Size ' + (idx + 1);
    }
    const m = pickMeasurements(o);
    if (m) {
      out.push({ label, a: m.a, b: m.b, c: m.c });
    }
  });
  return out;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return '';
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) {
    return parseFloat(v);
  }
  return null;
}

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
