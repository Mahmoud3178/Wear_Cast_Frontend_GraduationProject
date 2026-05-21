import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface CatalogProductCard {
  id: number;
  name: string;
  imageUrl: string | null;
  price: number;
  category?: string;
  categoryName?: string;
  type?: string;
}

@Injectable({ providedIn: 'root' })
export class CustomerCatalogService {
  private readonly base = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getRecommendations(topK = 8): Observable<CatalogProductCard[]> {
    const params = new HttpParams().set('topK', String(Math.max(1, Math.min(topK, 50))));
    const url = `${this.base}/api/customer-catalog/recommendations`;
    return this.http.get<unknown>(url, { params }).pipe(
      map(res => this.normalizeProductList(res)),
      catchError(() => of([]))
    );
  }

  private normalizeProductList(res: unknown): CatalogProductCard[] {
    let rows: unknown = res;
    if (rows && typeof rows === 'object' && !Array.isArray(rows)) {
      const o = rows as Record<string, unknown>;
      rows =
        o['data'] ??
        o['Data'] ??
        o['items'] ??
        o['Items'] ??
        o['products'] ??
        o['Products'] ??
        o;
      if (rows && typeof rows === 'object' && !Array.isArray(rows)) {
        const inner = rows as Record<string, unknown>;
        rows = inner['items'] ?? inner['Items'] ?? inner['data'] ?? inner['Data'] ?? rows;
      }
    }
    if (!Array.isArray(rows)) return [];

    return rows.map((p: Record<string, unknown>) => ({
      id: Number(p['id'] ?? p['Id'] ?? p['productId'] ?? p['ProductId'] ?? 0),
      name: String(p['name'] ?? p['Name'] ?? p['productName'] ?? 'Product'),
      imageUrl:
        (p['imageUrl'] ??
          p['ImageUrl'] ??
          p['mainImageUrl'] ??
          p['MainImageUrl'] ??
          (Array.isArray(p['colors']) && (p['colors'] as unknown[])[0]
            ? ((p['colors'] as Record<string, unknown>[])[0]['mainImageUrl'] ??
              (p['colors'] as Record<string, unknown>[])[0]['imageUrl'])
            : null)) as string | null,
      price: Number(p['price'] ?? p['Price'] ?? p['basePrice'] ?? 0),
      category: String(p['categoryName'] ?? p['CategoryName'] ?? ''),
      categoryName: String(p['categoryName'] ?? p['CategoryName'] ?? ''),
      type: String(p['type'] ?? p['Type'] ?? '').toLowerCase().trim()
    })).filter(p => p.id > 0);
  }
}
