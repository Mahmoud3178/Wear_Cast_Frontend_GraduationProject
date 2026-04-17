import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface OrderItem {
  name: string;
  imageUrl?: string | null;
  quantity: number;
  price: number;
  size?: string;
}

export interface Order {
  orderId: number;
  status: number;
  statusLabel: string;
  createdAt: string;
  total: number;
  items: OrderItem[];
  itemsLoading?: boolean;
  type: 'design' | 'fixed';
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly base = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  /**
   * Since the backend has no customer-facing "my orders" endpoint,
   * we fetch the customer's designed product catalog as their order/design history.
   */
  getMyOrders(): Observable<Order[]> {
    return forkJoin({
      designs: this.http.get<any>(`${this.base}/api/customer/catalog/designed-products`, {
        params: { PageIndex: 1, PageSize: 50 }
      }).pipe(catchError(() => of(null))),
    }).pipe(
      map(({ designs }) => {
        const orders: Order[] = [];

        // Parse designed products
        if (designs) {
          let rows: any = designs;
          if (rows && typeof rows === 'object' && !Array.isArray(rows)) {
            rows = rows.data ?? rows.items ?? rows.result ?? rows.products ?? rows;
          }
          if (rows && typeof rows === 'object' && !Array.isArray(rows)) {
            rows = rows.items ?? rows.data ?? [];
          }
          if (Array.isArray(rows)) {
            rows.forEach((d: any, idx: number) => {
              orders.push(this.mapDesignProduct(d, idx));
            });
          }
        }

        return orders;
      }),
      catchError(() => of([]))
    );
  }

  getOrderItems(orderId: number): Observable<OrderItem[]> {
    return this.http.get<any>(`${this.base}/api/Orders/${orderId}/items`).pipe(
      map(res => {
        let rows = res?.data ?? res;
        if (!Array.isArray(rows)) return [];
        return rows.map((i: any) => ({
          name: i.productName || i.name || i.Name || 'Item',
          imageUrl: i.imageUrl || i.ImageUrl || null,
          quantity: i.quantity || i.Quantity || 1,
          price: i.price || i.Price || i.unitPrice || 0,
          size: i.size || i.Size
        } as OrderItem));
      }),
      catchError(() => of([]))
    );
  }

  private mapDesignProduct(d: any, idx: number): Order {
    const id = d.id || d.Id || d.designedProductId || (1000 + idx);
    const name = d.name || d.Name || d.productName || d.ProductName || d.designName || `Design #${id}`;
    const imgUrl = d.frontImageUrl || d.FrontImageUrl || d.imageUrl || d.ImageUrl ||
                   d.mainImageUrl || d.MainImageUrl ||
                   (d.images && d.images.length > 0 ? d.images[0].imageUrl || d.images[0].url : null) || null;
    const price = d.price || d.Price || d.totalPrice || d.basePrice || 0;
    const createdAt = d.createdAt || d.CreatedAt || d.createDate || '';

    return {
      orderId: id,
      status: 0,
      statusLabel: 'Design',
      createdAt,
      total: price,
      type: 'design',
      items: [{
        name,
        imageUrl: imgUrl,
        quantity: 1,
        price,
      }]
    };
  }
}
