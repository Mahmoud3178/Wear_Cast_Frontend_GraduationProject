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
  getShipments(pageIndex = 1, pageSize = 10): Observable<any> {
    let params = new HttpParams()
      .set('pageIndex', pageIndex)
      .set('pageSize', pageSize);

    return this.http.get(`${this.api}/api/Shipments`, { params });
  }

  // 🔹 DETAILS
  getShipmentDetails(id: number): Observable<any> {
    return this.http.get(`${this.api}/api/Orders/shipment/${id}`);
  }

  // 🔹 ITEMS
  getShipmentItems(id: number, page = 1, size = 10): Observable<any> {
    let params = new HttpParams()
      .set('pageNumber', page)
      .set('pageSize', size)
      .set('sortDescending', false);

    return this.http.get(`${this.api}/api/Orders/shipment/${id}/items`, { params });
  }
}
