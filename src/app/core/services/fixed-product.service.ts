import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface FixedProductSummary {
  id: number;
  name: string;
  price: number;
  imageUrl: string | null;
  categoryName: string;
  targetAudience: number;
  dressStyle: number;
}

export interface FixedProductColor {
  id: number;
  colorName: string;
  colorCode: string;
}

export interface FixedProductColorDetail {
  id: number;
  colorName: string;
  colorCode: string;
  imageUrl: string;
  sizes: { size: string; quantity: number }[];
  additionalImages: { id: number; imageUrl: string }[];
}

export interface FixedProductDetail {
  id: number;
  name: string;
  price: number;
  description: string;
  categoryName: string;
  targetAudience: number | string;
  dressStyle: number | string;
  imageUrl: string | null;
  colors: FixedProductColorDetail[];
  sellerName?: string;
  sizeDetails?: { size: string; a: number; b: number; c: number }[];
}

@Injectable({ providedIn: 'root' })
export class FixedProductService {
  private readonly base = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  /** GET /api/FixedProduct/GetAll — public paginated list */
  getAll(params: Record<string, any> = {}): Observable<{
    items: FixedProductSummary[];
    total: number;
    pages: number;
    pageIndex: number;
  }> {
    const url = `${this.base}/api/FixedProduct/GetAll`;
    return this.http.get<any>(url, { params }).pipe(
      map(res => {
        const payload = unwrapPayload(res);
        if (Array.isArray(payload)) {
          return {
            items: payload.map((p: any) => this.mapSummary(p)),
            total: payload.length,
            pages: 1,
            pageIndex: 1
          };
        }
        const items = payload?.items ?? payload?.products ?? [];
        const total =
          payload?.totalCount ??
          payload?.total ??
          payload?.records ??
          payload?.count ??
          items.length;
        const pageSize = Number(params['PageSize'] ?? payload?.pageSize ?? 16) || 16;
        const pageIndex = Number(params['PageIndex'] ?? payload?.pageIndex ?? 1) || 1;
        const pages =
          payload?.pages ??
          (total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1);
        return {
          items: (items as any[]).map(p => this.mapSummary(p)),
          total,
          pages,
          pageIndex
        };
      }),
      catchError(() => of({ items: [], total: 0, pages: 1, pageIndex: 1 }))
    );
  }

  /** GET /api/FixedProduct/GetDetailsById/{id} — full product details */
  getDetailsById(id: number): Observable<FixedProductDetail | null> {
    const url = `${this.base}/api/FixedProduct/GetDetailsById/${id}`;
    return this.http.get<any>(url).pipe(
      map(res => {
        const d = unwrapProductLike(res);
        if (!d || typeof d !== 'object') return null;
        const rid = d.id ?? d.Id ?? id;
        const name =
          d.name ??
          d.Name ??
          d.productName ??
          d.ProductName ??
          `Product #${rid}`;
        const cat = d.category ?? d.Category;
        const categoryName =
          d.categoryName ??
          d.CategoryName ??
          (cat && typeof cat === 'object'
            ? (cat as any).name ?? (cat as any).Name ?? ''
            : '');
        const mainFromCategory =
          cat && typeof cat === 'object'
            ? (cat as any).imageUrl ?? (cat as any).ImageUrl ?? null
            : null;
        return {
          id: rid,
          name,
          price: d.price ?? d.Price ?? 0,
          description: d.description ?? d.Description ?? '',
          categoryName,
          targetAudience: d.targetAudience ?? d.TargetAudience ?? 0,
          dressStyle: d.dressStyle ?? d.DressStyle ?? 0,
          imageUrl:
            d.imageUrl ??
            d.ImageUrl ??
            d.mainImageUrl ??
            d.MainImageUrl ??
            mainFromCategory ??
            null,
          colors: (d.colors ?? d.Colors ?? []).map((c: any) => ({
            id: c.id ?? c.Id ?? 0,
            colorName: c.colorName ?? c.ColorName ?? c.name ?? '',
            colorCode: c.colorCode ?? c.ColorCode ?? c.hexCode ?? '',
            imageUrl: c.imageUrl ?? c.ImageUrl ?? '',
            sizes: (c.availableSizes ?? c.sizes ?? c.Sizes ?? []).map((s: any) => ({
              size: s.size ?? s.Size ?? '',
              quantity: s.quantity ?? s.Quantity ?? 0
            })),
            additionalImages: (c.images ?? c.additionalImages ?? c.AdditionalImages ?? []).map((img: any) => ({
              id: img.id ?? img.Id ?? 0,
              imageUrl: img.imageUrl ?? img.ImageUrl ?? ''
            }))
          })),
          sellerName: d.sellerName ?? d.SellerName ?? '',
          sizeDetails: (d.sizeDetails ?? d.SizeDetails ?? []).map((sd: any) => ({
            size: sd.size ?? sd.Size ?? '',
            a: sd.a ?? sd.A ?? 0,
            b: sd.b ?? sd.B ?? 0,
            c: sd.c ?? sd.C ?? 0
          }))
        } as FixedProductDetail;
      }),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) return of(null);
        const body = err.error as Record<string, unknown> | undefined;
        const detail =
          (typeof body?.['detail'] === 'string' && body['detail']) ||
          (typeof body?.['title'] === 'string' && body['title']) ||
          err.message;
        return throwError(() => new Error(detail || `Request failed (${err.status})`));
      })
    );
  }

  /** GET /api/FixedProductColor/GetColorById/{Id} — full color with sizes + images */
  getColorById(colorId: number): Observable<FixedProductColorDetail | null> {
    const url = `${this.base}/api/FixedProductColor/GetColorById/${colorId}`;
    return this.http.get<any>(url).pipe(
      map(res => {
        const d = unwrapPayload(res);
        if (!d || typeof d !== 'object') return null;
        return {
          id: d.id ?? d.Id ?? colorId,
          colorName: d.colorName ?? d.ColorName ?? '',
          colorCode: d.colorCode ?? d.ColorCode ?? '',
          imageUrl: d.imageUrl ?? d.ImageUrl ?? '',
          sizes: (d.sizes ?? d.Sizes ?? []).map((s: any) => ({
            size: s.size ?? s.Size ?? '',
            quantity: s.quantity ?? s.Quantity ?? 0
          })),
          additionalImages: (d.additionalImages ?? d.AdditionalImages ?? []).map((img: any) => ({
            id: img.id ?? img.Id ?? 0,
            imageUrl: img.imageUrl ?? img.ImageUrl ?? ''
          }))
        } as FixedProductColorDetail;
      }),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) return of(null);
        const body = err.error as Record<string, unknown> | undefined;
        const detail =
          (typeof body?.['detail'] === 'string' && body['detail']) ||
          (typeof body?.['title'] === 'string' && body['title']) ||
          err.message;
        return throwError(() => new Error(detail || `Request failed (${err.status})`));
      })
    );
  }

  /** GET /api/FixedProductColor/GetAllColorByProductId/{Id} */
  getColorsByProductId(productId: number): Observable<FixedProductColor[]> {
    const url = `${this.base}/api/FixedProductColor/GetAllColorByProductId/${productId}`;
    return this.http.get<any>(url).pipe(
      map(res => {
        let list: unknown = unwrapPayload(res) ?? [];
        if (list && typeof list === 'object' && !Array.isArray(list)) {
          const lo = list as Record<string, unknown>;
          list = lo['items'] ?? lo['Items'] ?? lo['data'] ?? [];
        }
        if (!Array.isArray(list)) return [];
        return list.map((c: any) => ({
          id: c.id ?? c.Id ?? 0,
          colorName: c.colorName ?? c.ColorName ?? c.name ?? '',
          colorCode: c.colorCode ?? c.ColorCode ?? c.hexCode ?? ''
        }));
      }),
      catchError(() => of([]))
    );
  }

  private mapSummary(p: any): FixedProductSummary {
    return {
      id: p.id ?? p.Id ?? 0,
      name: p.name ?? p.Name ?? p.productName ?? 'Product',
      price: p.price ?? p.Price ?? 0,
      imageUrl: p.imageUrl ?? p.ImageUrl ?? p.mainImageUrl ?? p.MainImageUrl ?? null,
      categoryName: p.categoryName ?? p.CategoryName ?? '',
      targetAudience: p.targetAudience ?? p.TargetAudience ?? 0,
      dressStyle: p.dressStyle ?? p.DressStyle ?? 0
    };
  }
}

/** Strips common API envelopes; returns payload object or array. */
function unwrapPayload(res: unknown): any {
  if (res == null || typeof res !== 'object') return res;
  const o = res as Record<string, unknown>;
  let inner: unknown = o['data'] ?? o['Data'] ?? o['result'] ?? o['Result'] ?? res;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const io = inner as Record<string, unknown>;
    const nested = io['data'] ?? io['Data'] ?? io['value'] ?? io['Value'];
    if (nested != null && typeof nested === 'object') inner = nested;
  }
  return inner;
}

/** Product detail body may be nested under `product`, `fixedProduct`, etc. */
function unwrapProductLike(res: unknown): any {
  const base = unwrapPayload(res);
  if (base == null) return null;
  if (typeof base !== 'object' || Array.isArray(base)) return base;
  const o = base as Record<string, unknown>;
  const nested =
    o['product'] ??
    o['Product'] ??
    o['fixedProduct'] ??
    o['FixedProduct'] ??
    o['details'] ??
    o['Details'];
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) return nested;
  return base;
}
