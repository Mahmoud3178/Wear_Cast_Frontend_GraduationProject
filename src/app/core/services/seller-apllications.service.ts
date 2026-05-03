import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SellerApllicationsService {

  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // 🔹 Get All
  getAll(pageIndex = 1, pageSize = 10): Observable<any> {
    let params = new HttpParams()
      .set('PageIndex', pageIndex)
      .set('PageSize', pageSize);

    return this.http.get(`${this.api}/api/seller-applications/GetAll`, { params });
  }

  // 🔹 Get Details
  getById(id: number): Observable<any> {
    return this.http.get(`${this.api}/api/seller-applications/${id}`);
  }

  // 🔹 Approve
approve(email: string): Observable<any> {
  return this.http.put(
    `${this.api}/api/seller-applications/${encodeURIComponent(email)}/approve`,
    {}
  );
}

reject(email: string, reason: string): Observable<any> {
  return this.http.put(
    `${this.api}/api/seller-applications/${encodeURIComponent(email)}/reject`,
    {
      reason: reason
    }
  );
}
}
