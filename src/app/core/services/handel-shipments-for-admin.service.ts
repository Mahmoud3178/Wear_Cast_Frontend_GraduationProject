import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HandelShipmentsForAdminService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // 🔹 GET ALL SHIPMENTS
getShipments(params: any = {}): Observable<any> {
  let httpParams = new HttpParams();
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      httpParams = httpParams.set(key, params[key]);
    }
  });
  return this.http.get(`${this.api}/api/Shipments`, { params: httpParams });
}

  // 🔹 DETAILS — يرجع الشيبمنت مع orders[]
  getShipmentDetails(id: number): Observable<any> {
    return this.http.get(`${this.api}/api/Orders/shipment/${id}`);
  }

  // 🔹 ORDER ITEMS — GET /api/Orders/{orderId}/items
  getOrderItems(orderId: number): Observable<any> {
    return this.http.get(`${this.api}/api/Orders/${orderId}/items`);
  }
}
