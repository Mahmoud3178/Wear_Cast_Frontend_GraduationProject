import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SallerOrderService {

  private baseUrl = `${environment.apiUrl}/api/Orders`;

  constructor(private http: HttpClient) {}

  // 🔹 Get Seller Orders
  getSellerOrders(pageNumber = 1, pageSize = 10, statusFilter?: number) {
    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);

    if (statusFilter !== undefined) {
      params = params.set('statusFilter', statusFilter);
    }

    const token = localStorage.getItem('token') || '';

    return this.http.get(`${this.baseUrl}/seller`, {
      params,
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    });
  }

  // 🔹 Get Order Items
  getOrderItems(orderId: number) {
    const token = localStorage.getItem('token') || '';
    return this.http.get(`${this.baseUrl}/${orderId}/items`, {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    });
  }

  // 🔹 Update Order Status
updateOrderStatus(orderId: number, payload: any) {
  return this.http.put(`api/Orders/${orderId}/status`, payload);
}
}
