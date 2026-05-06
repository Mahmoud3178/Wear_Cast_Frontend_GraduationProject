import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { normalizeWearCastApiDateToIso } from '../utils/api-date';

export interface AddCustomerDesignRequest {
  /** Display name for the design (API `Name`). */
  name: string;
  /** Count of user-uploaded image objects in the design JSON (API `AssetCount`). */
  assetCount: number;
  viewDesignsJson: string;
  productId: number;
  productColorId: number;
  // Optional: 4 view images for the new draft API (front, back, left, right)
  frontImage?: Blob | File | string;
  backImage?: Blob | File | string;
  leftImage?: Blob | File | string;
  rightImage?: Blob | File | string;
}

export interface CustomerDesignImageRequest {
  side: 'front' | 'back' | 'left' | 'right';
  imageData: Blob | File | string; // Base64 string, Blob, or File
}

/** Normalized row for “My saved designs” (GET list). */
export interface CustomerDesignSummary {
  id: number;
  name: string;
  productId?: number;
  productColorId?: number;
  createdAt?: string;
  /** Thumbnail / front preview if the API returns one */
  previewUrl?: string;
}

interface ApiEnvelope<T = unknown> {
  isSuccess: boolean;
  data?: T;
  error?: { code: string; description: string };
  validationErrors?: Record<string, string | string[]>;
}

@Injectable({ providedIn: 'root' })
export class CustomerDesignService {
  private readonly base = environment.apiUrl;

  /** 100x100 transparent PNG — server always receives four multipart parts when a side is missing. */
  private static readonly placeholderViewPngDataUrl =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAnElEQVR42u3RAQ0AAAjDMOZf6BzO0A0KvyRVcsjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI2DMz8n8j7r45xNkAAAAASUVORK5CYII=';

  constructor(private readonly http: HttpClient) {}

  private appendDesignDraftFormFields(fd: FormData, body: AddCustomerDesignRequest): void {
    const name = (body.name && String(body.name).trim()) || 'My design';
    const assetCount = Number.isFinite(body.assetCount) ? Math.max(0, Math.floor(body.assetCount)) : 0;

    fd.append('Name', name);
    fd.append('name', name);
    fd.append('AssetCount', String(assetCount));
    fd.append('assetCount', String(assetCount));
    fd.append('ProductId', body.productId.toString());
    fd.append('productId', body.productId.toString());
    fd.append('ProductColorId', body.productColorId.toString());
    fd.append('productColorId', body.productColorId.toString());
    fd.append('ViewDesignsJson', body.viewDesignsJson);
    fd.append('viewDesignsJson', body.viewDesignsJson);

    this.appendImageToFormData(
      fd,
      'FrontImage',
      body.frontImage ?? CustomerDesignService.placeholderViewPngDataUrl
    );
    this.appendImageToFormData(
      fd,
      'BackImage',
      body.backImage ?? CustomerDesignService.placeholderViewPngDataUrl
    );
    this.appendImageToFormData(
      fd,
      'LeftImage',
      body.leftImage ?? CustomerDesignService.placeholderViewPngDataUrl
    );
    this.appendImageToFormData(
      fd,
      'RightImage',
      body.rightImage ?? CustomerDesignService.placeholderViewPngDataUrl
    );
  }

  private mapDesignHttpError(err: unknown): Observable<never> {
    if (err instanceof HttpErrorResponse) {
      const b = err.error as ApiEnvelope | Record<string, unknown> | string | null;
      if (typeof b === 'string' && b.trim()) {
        return throwError(() => new Error(b.trim()));
      }
      if (b && typeof b === 'object' && 'isSuccess' in b && !(b as ApiEnvelope).isSuccess) {
        const e = (b as ApiEnvelope).error?.description;
        return throwError(() => new Error(e || err.message || `HTTP ${err.status}`));
      }
      if (b && typeof b === 'object') {
        const o = b as Record<string, unknown>;
        const detail = o['detail'];
        if (typeof detail === 'string' && detail.trim()) {
          return throwError(() => new Error(detail.trim()));
        }
        const title = o['title'];
        if (typeof title === 'string' && title.trim()) {
          return throwError(() => new Error(title.trim()));
        }
        const msg = o['message'];
        if (typeof msg === 'string' && msg.trim()) {
          return throwError(() => new Error(msg.trim()));
        }
      }
      return throwError(() => new Error(err.message || `HTTP ${err.status}`));
    }
    return throwError(() => (err instanceof Error ? err : new Error(String(err))));
  }

  /** POST /api/customers/me/designs — creates a draft with customer artwork on a designed product color.
   *  Now accepts 4 view images (front, back, left, right) to attach to the draft.
   *  Returns created design id when the API sends one.
   */
  saveDesign(body: AddCustomerDesignRequest): Observable<number | null> {
    const url = `${this.base}/api/customers/me/designs`;
    const fd = new FormData();
    this.appendDesignDraftFormFields(fd, body);
    const name = (body.name && String(body.name).trim()) || 'My design';
    const assetCount = Number.isFinite(body.assetCount) ? Math.max(0, Math.floor(body.assetCount)) : 0;

    console.log('[WearCast] POST /api/customers/me/designs');
    console.log('[WearCast] Name:', name, 'AssetCount:', assetCount);
    console.log('[WearCast] ProductId:', body.productId, 'ProductColorId:', body.productColorId);
    console.log('[WearCast] viewDesignsJson length:', body.viewDesignsJson?.length ?? 0);
    console.log('[WearCast] API Base URL:', this.base || '(empty - proxied)');

    // Log image info (safely)
    const logImageInfo = (label: string, img: unknown) => {
      if (!img) return console.log(`[WearCast] ${label}: null/undefined`);
      if (typeof img === 'string') {
        if (img.startsWith('data:')) {
          return console.log(`[WearCast] ${label}: data URL (${img.length} chars)`);
        }
        return console.log(`[WearCast] ${label}: string (${img.length} chars)`);
      }
      if (img instanceof Blob) {
        return console.log(`[WearCast] ${label}: Blob (${img.size} bytes, ${img.type})`);
      }
      if (img instanceof File) {
        return console.log(`[WearCast] ${label}: File (${img.name}, ${img.size} bytes)`);
      }
      console.log(`[WearCast] ${label}: unknown type`, typeof img);
    };

    logImageInfo('frontImage', body.frontImage);
    logImageInfo('backImage', body.backImage);
    logImageInfo('leftImage', body.leftImage);
    logImageInfo('rightImage', body.rightImage);

    return this.http.post<unknown>(url, fd).pipe(
      map(raw => {
        console.log('[WearCast] saveDesign response:', raw);
        if (raw && typeof raw === 'object' && 'isSuccess' in raw) {
          const res = raw as ApiEnvelope;
          if (!res.isSuccess) {
            throw new Error(res.error?.description || 'Save design failed');
          }
          return this.extractDesignId(res.data);
        }
        return this.extractDesignId(raw);
      }),
      catchError((err: unknown) => {
        console.error('[WearCast] saveDesign HTTP error:', err);
        return this.mapDesignHttpError(err);
      })
    );
  }

  /** PUT /api/customers/me/designs/{id} — update an existing draft (same multipart shape as POST). */
  updateDesign(id: number, body: AddCustomerDesignRequest): Observable<void> {
    const url = `${this.base}/api/customers/me/designs/${id}`;
    const fd = new FormData();
    this.appendDesignDraftFormFields(fd, body);
    console.log('[WearCast] PUT /api/customers/me/designs/' + id);

    return this.http.put<unknown>(url, fd).pipe(
      map(raw => {
        if (raw && typeof raw === 'object' && 'isSuccess' in raw) {
          const res = raw as ApiEnvelope;
          if (!res.isSuccess) {
            throw new Error(res.error?.description || 'Update design failed');
          }
        }
      }),
      catchError((err: unknown) => {
        console.error('[WearCast] updateDesign HTTP error:', err);
        return this.mapDesignHttpError(err);
      })
    );
  }

  private appendImageToFormData(fd: FormData, fieldName: string, imageData: Blob | File | string): void {
    if (typeof imageData === 'string') {
      // If it's a base64 data URL, convert to blob
      if (imageData.startsWith('data:')) {
        const blob = this.dataURLToBlob(imageData);
        fd.append(fieldName, blob, `${fieldName.toLowerCase()}.png`);
      } else {
        // Plain string (unlikely for images, but handle it)
        fd.append(fieldName, imageData);
      }
    } else {
      // Blob or File
      fd.append(fieldName, imageData);
    }
  }

  private dataURLToBlob(dataURL: string): Blob {
    try {
      const arr = dataURL.split(',');
      if (arr.length < 2) {
        console.error('[CustomerDesignService] Invalid data URL format');
        return new Blob([], { type: 'image/png' });
      }
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch (err) {
      console.error('[CustomerDesignService] Failed to convert data URL to blob:', err);
      // Return empty blob as fallback
      return new Blob([], { type: 'image/png' });
    }
  }

  /** Generate view images from canvas elements or data URLs for the 4 product views.
   *  Returns an object with front, back, left, right image data that can be passed to saveDesign.
   */
  generateViewImagesFromCanvases(
    frontCanvas?: HTMLCanvasElement | null,
    backCanvas?: HTMLCanvasElement | null,
    leftCanvas?: HTMLCanvasElement | null,
    rightCanvas?: HTMLCanvasElement | null
  ): { front?: string; back?: string; left?: string; right?: string } {
    const result: { front?: string; back?: string; left?: string; right?: string } = {};

    if (frontCanvas) {
      result.front = frontCanvas.toDataURL('image/png');
    }
    if (backCanvas) {
      result.back = backCanvas.toDataURL('image/png');
    }
    if (leftCanvas) {
      result.left = leftCanvas.toDataURL('image/png');
    }
    if (rightCanvas) {
      result.right = rightCanvas.toDataURL('image/png');
    }

    return result;
  }

  /** GET /api/customers/me/designs — paginated list of the customer's saved designs with optional search. */
  listMyDesigns(
    pageIndex = 1,
    pageSize = 10,
    searchTerm?: string
  ): Observable<{ items: CustomerDesignSummary[]; totalCount: number; totalPages: number }> {
    const url = `${this.base}/api/customers/me/designs`;
    const params: Record<string, string> = {
      pageIndex: String(pageIndex),
      pageSize: String(pageSize)
    };
    if (searchTerm && searchTerm.trim()) {
      params['searchTerm'] = searchTerm.trim();
    }
    return this.http
      .get<unknown>(url, { params })
      .pipe(map(raw => {
        const normalized = normalizeCustomerDesignList(raw);
        // Try to extract pagination info from response
        let totalCount = normalized.length;
        let totalPages = 1;
        if (raw && typeof raw === 'object') {
          const o = raw as Record<string, unknown>;
          const data = o['data'] ?? o['Data'] ?? o;
          if (data && typeof data === 'object' && !Array.isArray(data)) {
            const d = data as Record<string, unknown>;
            const tc = d['totalCount'] ?? d['TotalCount'] ?? d['total'] ?? d['Total'];
            const tp = d['totalPages'] ?? d['TotalPages'] ?? d['pages'] ?? d['Pages'];
            if (typeof tc === 'number') totalCount = tc;
            if (typeof tp === 'number') totalPages = tp;
          }
        }
        // Calculate totalPages if not provided
        if (totalPages === 1 && totalCount > pageSize) {
          totalPages = Math.ceil(totalCount / pageSize);
        }
        return { items: normalized, totalCount, totalPages };
      }));
  }

  /** GET /api/customers/me/designs/{id} — full design for restoring the editor. */
  getMyDesignById(id: number): Observable<Record<string, unknown> | null> {
    const url = `${this.base}/api/customers/me/designs/${id}`;
    return this.http.get<unknown>(url).pipe(
      map(raw => unwrapDesignPayload(raw)),
      catchError(() => of(null))
    );
  }

  /** DELETE /api/customers/me/designs/{id} */
  deleteMyDesign(id: number): Observable<unknown> {
    const url = `${this.base}/api/customers/me/designs/${id}`;
    return this.http.delete(url);
  }

  private extractDesignId(data: unknown): number | null {
    if (typeof data === 'number' && Number.isFinite(data)) {
      return data;
    }
    if (typeof data === 'string' && /^\d+$/.test(data)) {
      return parseInt(data, 10);
    }
    if (!data || typeof data !== 'object') {
      return null;
    }
    const o = data as Record<string, unknown>;
    const v =
      o['id'] ??
      o['Id'] ??
      o['designId'] ??
      o['DesignId'] ??
      o['customerDesignId'] ??
      o['CustomerDesignId'];
    if (typeof v === 'number' && Number.isFinite(v)) {
      return v;
    }
    if (typeof v === 'string' && /^\d+$/.test(v)) {
      return parseInt(v, 10);
    }
    return null;
  }
}

function pickNum(o: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'number' && Number.isFinite(v)) {
      return v;
    }
    if (typeof v === 'string' && /^\d+$/.test(v)) {
      return parseInt(v, 10);
    }
  }
  return undefined;
}

function pickStr(o: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return undefined;
}

/** Unwrap `{ isSuccess, data }` or bare object for a single design DTO. */
function unwrapDesignPayload(root: unknown): Record<string, unknown> | null {
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

function normalizeCustomerDesignList(root: unknown): CustomerDesignSummary[] {
  if (!root || typeof root !== 'object') {
    return [];
  }
  const o = root as Record<string, unknown>;
  let rows: unknown[] = [];
  if (Array.isArray(root)) {
    rows = root;
  } else if ('isSuccess' in o && o['isSuccess'] === false) {
    return [];
  } else {
    const data = o['data'] ?? o['Data'] ?? o['items'] ?? o['Items'];
    if (Array.isArray(data)) {
      rows = data;
    } else if (data && typeof data === 'object' && !Array.isArray(data)) {
      const d = data as Record<string, unknown>;
      const inner = d['items'] ?? d['Items'] ?? d['designs'] ?? d['Designs'];
      if (Array.isArray(inner)) {
        rows = inner;
      }
    }
  }
  const out: CustomerDesignSummary[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const r = row as Record<string, unknown>;
    const id =
      pickNum(r, ['id', 'Id', 'designId', 'DesignId', 'customerDesignId', 'CustomerDesignId']) ?? 0;
    if (!id) {
      continue;
    }
    const name =
      pickStr(r, ['name', 'Name', 'designName', 'DesignName', 'title', 'Title']) ||
      `Design ${id}`;
    const productId = pickNum(r, ['productId', 'ProductId', 'designedProductId', 'DesignedProductId']);
    const productColorId = pickNum(r, ['productColorId', 'ProductColorId', 'colorId', 'ColorId']);
    const createdRaw =
      r['createdAt'] ??
      r['CreatedAt'] ??
      r['createdOn'] ??
      r['CreatedOn'] ??
      r['dateCreated'] ??
      r['DateCreated'];
    const createdAt =
      normalizeWearCastApiDateToIso(createdRaw) ??
      pickStr(r, [
        'createdAt',
        'CreatedAt',
        'createdOn',
        'CreatedOn',
        'dateCreated',
        'DateCreated'
      ]);
    const previewUrl = pickPreviewUrl(r);
    out.push({
      id,
      name,
      productId,
      productColorId,
      createdAt,
      previewUrl
    });
  }
  return out;
}

function pickPreviewUrl(r: Record<string, unknown>): string | undefined {
  const direct = pickStr(r, [
    'frontImageUrl',
    'FrontImageUrl',
    'frontDesignImageUrl',
    'FrontDesignImageUrl',
    'frontViewImageUrl',
    'FrontViewImageUrl',
    'previewImageUrl',
    'PreviewImageUrl',
    'thumbnailUrl',
    'ThumbnailUrl',
    'thumbUrl',
    'ThumbUrl',
    'image',
    'Image',
    'imageUrl',
    'ImageUrl',
    'mainImageUrl',
    'MainImageUrl',
    'url',
    'Url'
  ]);
  if (direct) return direct;

  const nestedFront = r['frontImage'] ?? r['FrontImage'];
  if (nestedFront && typeof nestedFront === 'object' && !Array.isArray(nestedFront)) {
    const nested = pickStr(nestedFront as Record<string, unknown>, [
      'url',
      'Url',
      'imageUrl',
      'ImageUrl',
      'fileUrl',
      'FileUrl'
    ]);
    if (nested) return nested;
  }

  const viewImages = r['viewImages'] ?? r['ViewImages'] ?? r['designImages'] ?? r['DesignImages'];
  if (Array.isArray(viewImages)) {
    for (const img of viewImages) {
      if (!img || typeof img !== 'object') continue;
      const o = img as Record<string, unknown>;
      const sideRaw = o['side'] ?? o['Side'] ?? o['view'] ?? o['View'] ?? o['viewSide'] ?? o['ViewSide'];
      const side = String(sideRaw ?? '').toLowerCase();
      const isFront =
        side === 'front' ||
        side === '1' ||
        side === '0' ||
        side === 'frontside';
      if (!isFront && side) continue;
      const url = pickStr(o, ['url', 'Url', 'imageUrl', 'ImageUrl', 'fileUrl', 'FileUrl']);
      if (url) return url;
    }
  }

  const images = r['images'] ?? r['Images'];
  if (Array.isArray(images)) {
    for (const img of images) {
      if (!img || typeof img !== 'object') continue;
      const o = img as Record<string, unknown>;
      const side = String(o['side'] ?? o['Side'] ?? o['view'] ?? o['View'] ?? '').toLowerCase();
      const url = pickStr(o, ['url', 'Url', 'imageUrl', 'ImageUrl', 'fileUrl', 'FileUrl']);
      if (!url) continue;
      if (!side || side === 'front' || side === '1') return url;
    }
  }
  return undefined;
}
