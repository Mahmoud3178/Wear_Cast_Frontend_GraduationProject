import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
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
  colors: FixedProductColor[];
  sellerName?: string;
  sizeDetails?: { size: string; a: number; b: number; c: number }[];
}

@Injectable({ providedIn: 'root' })
export class FixedProductService {
  private readonly base = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  /** GET /api/FixedProduct/GetAll — public paginated list */
  getAll(params: Record<string, any> = {}): Observable<{ items: FixedProductSummary[]; total: number }> {
    const url = `${this.base}/api/FixedProduct/GetAll`;
    return this.http.get<any>(url, { params }).pipe(
      map(res => {
        // The response may be: { data: { items, totalCount } }, { items, totalCount }, or an array
        const payload = res?.data ?? res;
        if (Array.isArray(payload)) {
          return { items: payload.map((p: any) => this.mapSummary(p)), total: payload.length };
        }
        const items = payload?.items ?? payload?.products ?? [];
        const total = payload?.totalCount ?? payload?.total ?? payload?.count ?? items.length;
        return { items: (items as any[]).map(p => this.mapSummary(p)), total };
      }),
      catchError(() => of({ items: [], total: 0 }))
    );
  }

  /** GET /api/FixedProduct/GetDetailsById/{id} — full product details */
  getDetailsById(id: number): Observable<FixedProductDetail | null> {
    const url = `${this.base}/api/FixedProduct/GetDetailsById/${id}`;
    return this.http.get<any>(url).pipe(
      map(res => {
        const d = res?.data ?? res;
        if (!d) return null;
        return {
          id: d.id ?? d.Id ?? id,
          name: d.name ?? d.Name ?? d.productName ?? '',
          price: d.price ?? d.Price ?? 0,
          description: d.description ?? d.Description ?? '',
          categoryName: d.categoryName ?? d.CategoryName ?? '',
          targetAudience: d.targetAudience ?? d.TargetAudience ?? 0,
          dressStyle: d.dressStyle ?? d.DressStyle ?? 0,
          imageUrl: d.imageUrl ?? d.ImageUrl ?? d.mainImageUrl ?? null,
          colors: (d.colors ?? d.Colors ?? []).map((c: any) => ({
            id: c.id ?? c.Id ?? 0,
            colorName: c.colorName ?? c.ColorName ?? c.name ?? '',
            colorCode: c.colorCode ?? c.ColorCode ?? c.hexCode ?? ''
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
      catchError(() => of(null))
    );
  }

  /** GET /api/FixedProductColor/GetColorById/{Id} — full color with sizes + images */
  getColorById(colorId: number): Observable<FixedProductColorDetail | null> {
    const url = `${this.base}/api/FixedProductColor/GetColorById/${colorId}`;
    return this.http.get<any>(url).pipe(
      map(res => {
        const d = res?.data ?? res;
        if (!d) return null;
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
      catchError(() => of(null))
    );
  }

  /** GET /api/FixedProductColor/GetAllColorByProductId/{Id} */
  getColorsByProductId(productId: number): Observable<FixedProductColor[]> {
    const url = `${this.base}/api/FixedProductColor/GetAllColorByProductId/${productId}`;
    return this.http.get<any>(url).pipe(
      map(res => {
        const list = res?.data ?? res ?? [];
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
