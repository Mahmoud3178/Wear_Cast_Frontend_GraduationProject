import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SellerManagersService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getAll(providedSellerId?: number): Observable<any> {
    let params = new HttpParams();
    if (providedSellerId) params = params.set('ProvidedSellerId', providedSellerId);
    return this.http.get(`${this.api}/api/seller-managers/all`, { headers: this.headers, params });
  }

  getProfile(providedManagerId?: number): Observable<any> {
    let params = new HttpParams();
    if (providedManagerId) params = params.set('ProvidedManagerId', providedManagerId);
    return this.http.get(`${this.api}/api/seller-managers/profile`, { headers: this.headers, params });
  }

  updateProfile(body: { firstName: string; lastName: string; phoneNumber: string; providedManagerId?: number }): Observable<any> {
    return this.http.put(`${this.api}/api/seller-managers/profile`, body, { headers: this.headers });
  }

  create(body: {
    email: string; firstName: string; lastName: string;
    phoneNumber: string; password: string; confirmPassword: string;
    providedSellerId?: number;
  }): Observable<any> {
    return this.http.post(`${this.api}/api/seller-managers`, body, { headers: this.headers });
  }

delete(sellerManagerId: number, body: { reason: string }): Observable<any> {
  return this.http.delete(`${this.api}/api/sellers/managers/${sellerManagerId}`, {
    headers: this.headers,
    body,
    responseType: 'text'
  });
}
}
