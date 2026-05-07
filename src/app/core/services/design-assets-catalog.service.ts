import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface DesignAssetCategoryRow {
  id: number;
  name: string;
}

export interface DesignAssetRow {
  id: number;
  name: string;
  imageUrl: string;
  price?: number;
}

@Injectable({ providedIn: 'root' })
export class DesignAssetsCatalogService {
  private readonly base = environment.apiUrl.replace(/\/$/, '');

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService
  ) {}

  /** GET /api/assets-categories */
  getCategories(): Observable<DesignAssetCategoryRow[]> {
    const url = `${this.base}/api/assets-categories`;
    return this.http.get<unknown>(url, { ...this.authOpts() }).pipe(
      map(body => normalizeCategories(body)),
      catchError(() => of([]))
    );
  }

  /**
   * GET /api/design-assets (no category) or GET /api/design-assets/category/{id}
   */
  getAssets(
    categoryId: number | undefined,
    pageIndex = 1,
    pageSize = 80
  ): Observable<DesignAssetRow[]> {
    const path =
      categoryId != null && categoryId > 0
        ? `/api/design-assets/category/${categoryId}`
        : '/api/design-assets';
    const url = `${this.base}${path}`;
    const params = new HttpParams()
      .set('pageIndex', String(pageIndex))
      .set('pageSize', String(pageSize));
    return this.http.get<unknown>(url, { params, ...this.authOpts() }).pipe(
      map(body => normalizeAssetRows(body, raw => this.resolveMediaUrl(raw))),
      catchError(() => of([]))
    );
  }

  private authOpts(): { headers?: HttpHeaders } {
    const t = this.auth.getToken();
    return t
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${t}` }) }
      : {};
  }

  /**
   * Match catalog / designer rules: always strip the backend host so images
   * load same-origin (dev: Angular proxy, prod: Vercel `/uploads` rewrite).
   * Keeps the canvas non-tainted so Fabric filters and `toDataURL` work.
   */
  resolveMediaUrl(raw: string): string {
    const u = raw.trim();
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) {
      try {
        const urlObj = new URL(u);
        return urlObj.pathname + urlObj.search;
      } catch {
        return u;
      }
    }
    if (u.startsWith('//')) {
      try {
        const protocol =
          typeof window !== 'undefined' ? window.location.protocol : 'https:';
        const urlObj = new URL(`${protocol}${u}`);
        return urlObj.pathname + urlObj.search;
      } catch {
        return u;
      }
    }
    return u.startsWith('/') ? u : `/${u}`;
  }
}

/** Resolves list rows from bare arrays, envelopes, or paged `{ items }` under `data`. */
function extractRowArray(root: unknown): unknown[] {
  if (Array.isArray(root)) return root;
  if (!root || typeof root !== 'object') return [];
  const o = root as Record<string, unknown>;
  let inner: unknown =
    o['data'] ??
    o['Data'] ??
    o['items'] ??
    o['Items'] ??
    o['categories'] ??
    o['Categories'] ??
    o['assets'] ??
    o['Assets'];
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const p = inner as Record<string, unknown>;
    const nested =
      p['items'] ??
      p['Items'] ??
      p['records'] ??
      p['Records'] ??
      p['data'] ??
      p['Data'];
    if (Array.isArray(nested)) return nested;
  }
  return Array.isArray(inner) ? inner : [];
}

function normalizeCategories(root: unknown): DesignAssetCategoryRow[] {
  const rows = extractRowArray(root);
  const out: DesignAssetCategoryRow[] = [];
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const row = r as Record<string, unknown>;
    const id = pickNum(row, ['id', 'Id', 'categoryId', 'CategoryId']);
    const name = pickStr(row, ['name', 'Name', 'title', 'Title']);
    if (id != null && id > 0 && name) {
      out.push({ id, name });
    }
  }
  return out;
}

function normalizeAssetRows(
  root: unknown,
  resolve: (s: string) => string
): DesignAssetRow[] {
  const rows = extractRowArray(root);
  const out: DesignAssetRow[] = [];
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const row = r as Record<string, unknown>;
    const id = pickNum(row, ['id', 'Id', 'assetId', 'AssetId', 'designAssetId', 'DesignAssetId']);
    const name =
      pickStr(row, ['name', 'Name', 'title', 'Title', 'label', 'Label']) ||
      (id != null ? `Asset ${id}` : 'Asset');
    const rawImg = pickStr(row, [
      'imageUrl',
      'ImageUrl',
      'url',
      'Url',
      'fileUrl',
      'FileUrl',
      'thumbnailUrl',
      'ThumbnailUrl',
      'path',
      'Path',
      'image',
      'Image'
    ]);
    const imageUrl = rawImg ? resolve(rawImg) : '';
    const price = pickNum(row, ['price', 'Price']);
    if (id != null && id > 0 && imageUrl) {
      out.push({
        id,
        name,
        imageUrl,
        price: price != null ? price : undefined
      });
    }
  }
  return out;
}

function pickNum(o: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && /^-?\d+$/.test(v)) return parseInt(v, 10);
  }
  return null;
}

function pickStr(o: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}
