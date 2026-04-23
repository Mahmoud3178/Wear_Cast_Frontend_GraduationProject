import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface FavouriteItem {
  id: number;
  fixedProductColorId: number;
  fixedProductId: number;
  productName: string;
  colorName: string;
  colorCode: string;
  price: number;
  imageUrl: string | null;
  sizes: { size: string; quantity: number }[];
  addedAt: string;
}

export interface FavouritesResponse {
  items: FavouriteItem[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export interface AddFavouriteRequest {
  fixedProductColorId: number;
}

export interface DeleteFavouriteRequest {
  fixedProductColorId: number;
}

@Injectable({ providedIn: 'root' })
export class FavouritesService {
  private readonly base = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  /** GET /api/Favourites/GetAllByCustomerId - Get all favourites for the current customer */
  getAll(pageIndex: number = 1, pageSize: number = 100): Observable<FavouritesResponse> {
    const url = `${this.base}/api/Favourites/GetAllByCustomerId`;
    const params = { pageIndex: pageIndex.toString(), pageSize: pageSize.toString() };

    return this.http.get<any>(url, { params }).pipe(
      map(res => {
        const data = res?.data ?? res;
        const items = data?.items ?? data?.data ?? [];
        return {
          items: (items as any[]).map(item => this.mapFavouriteItem(item)),
          total: data?.totalCount ?? data?.total ?? items.length,
          pageIndex: data?.pageIndex ?? pageIndex,
          pageSize: data?.pageSize ?? pageSize
        };
      }),
      catchError(() => of({ items: [], total: 0, pageIndex, pageSize }))
    );
  }

  /** POST /api/Favourites/Add - Add a product color to favourites */
  addToFavourites(fixedProductColorId: number): Observable<boolean> {
    const url = `${this.base}/api/Favourites/Add`;
    const body: AddFavouriteRequest = { fixedProductColorId };

    return this.http.post<any>(url, body).pipe(
      map(res => {
        return res?.isSuccess ?? res?.success ?? true;
      }),
      catchError(() => of(false))
    );
  }

  /** DELETE /api/Favourites/Delete - Remove a product color from favourites */
  removeFromFavourites(fixedProductColorId: number): Observable<boolean> {
    const url = `${this.base}/api/Favourites/Delete`;
    const body: DeleteFavouriteRequest = { fixedProductColorId };

    return this.http.delete<any>(url, { body }).pipe(
      map(res => {
        return res?.isSuccess ?? res?.success ?? true;
      }),
      catchError(() => of(false))
    );
  }

  /** Check if a product color is in favourites (client-side check after loading all) */
  isInFavourites(colorId: number, favourites: FavouriteItem[]): boolean {
    return favourites.some(f => f.fixedProductColorId === colorId);
  }

  private mapFavouriteItem(item: any): FavouriteItem {
    // Handle nested product object if present
    const nested = item.product || item.Product || item.fixedProduct || item.FixedProduct || {};
    const o = { ...item, ...nested };

    // Try multiple field names for product ID
    const productId = o.fixedProductId ?? o.FixedProductId ?? o.productId ?? o.ProductId ?? o.id ?? o.Id ?? 0;

    // Try multiple field names for color
    const colorName = o.colorName ?? o.ColorName ?? o.color ?? o.Color ?? '';
    let colorCode = o.colorCode ?? o.ColorCode ?? o.colorHex ?? o.ColorHex ?? '';

    // If no color code but has color name, try to map common colors
    if (!colorCode && colorName) {
      colorCode = this.mapColorNameToCode(colorName);
    }

    return {
      id: o.id ?? o.Id ?? 0,
      fixedProductColorId: o.fixedProductColorId ?? o.FixedProductColorId ?? o.colorId ?? o.ColorId ?? 0,
      fixedProductId: productId,
      productName: o.productName ?? o.ProductName ?? o.name ?? o.Name ?? o.title ?? o.Title ?? '',
      colorName: colorName,
      colorCode: colorCode,
      price: o.price ?? o.Price ?? o.basePrice ?? o.BasePrice ?? 0,
      imageUrl: o.imageUrl ?? o.ImageUrl ?? o.mainImageUrl ?? o.MainImageUrl ?? o.image ?? o.Image ?? null,
      sizes: (o.sizes ?? o.Sizes ?? o.availableSizes ?? o.AvailableSizes ?? []).map((s: any) => ({
        size: s.size ?? s.Size ?? s.name ?? s.Name ?? '',
        quantity: s.quantity ?? s.Quantity ?? s.stock ?? s.Stock ?? s.qty ?? s.Qty ?? 0
      })),
      addedAt: o.addedAt ?? o.AddedAt ?? o.createdAt ?? o.CreatedAt ?? new Date().toISOString()
    };
  }

  private mapColorNameToCode(colorName: string): string {
    const colorMap: Record<string, string> = {
      'black': '#000000',
      'white': '#ffffff',
      'red': '#ef4444',
      'blue': '#3b82f6',
      'green': '#22c55e',
      'yellow': '#facc15',
      'purple': '#a855f7',
      'pink': '#ec4899',
      'orange': '#f97316',
      'gray': '#6b7280',
      'grey': '#6b7280',
      'navy': '#1e3a8a',
      'brown': '#92400e',
      'beige': '#d4c4b0',
      'cream': '#fffdd0'
    };
    return colorMap[colorName.toLowerCase()] || '';
  }
}
