import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AllSellerForAdminService {

  private baseUrl = `${environment.apiUrl}/api/sellers`;

  constructor(private http: HttpClient) {}

  // 🔹 Get all sellers
  getAllSellers(pageIndex = 1, pageSize = 5, searchTerm = '') {

    let params = new HttpParams()
      .set('PageIndex', pageIndex)
      .set('PageSize', pageSize);

    if (searchTerm) {
      params = params.set('SearchTerm', searchTerm);
    }

    return this.http.get(`${this.baseUrl}/allForAdmin`, { params });
  }

  // 🔥 الصحيح للتفاصيل
  getSellerProfile(id: number) {
    return this.http.get(`${this.baseUrl}/profile`, {
      params: { ProvidedSellerId: id }
    });
  }
}
