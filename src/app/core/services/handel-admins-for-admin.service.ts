import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HandelAdminsForAdminService {

  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getToken() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user?.token || '';
  }

  private headers() {
    return new HttpHeaders({
      Authorization: `Bearer ${this.getToken()}`
    });
  }

  // ================= GET ALL =================
  getAdmins(pageIndex = 1, pageSize = 10) {
    const params = new HttpParams()
      .set('PageIndex', pageIndex)
      .set('PageSize', pageSize);

    return this.http.get(`${this.base}/api/Admins/GetAll`, { params });
  }

  // ================= CREATE =================
  addAdmin(body: any) {
    return this.http.post(`${this.base}/api/admins`, body, {
      headers: this.headers()
    });
  }

  // ================= DELETE =================
  deleteAdmin(id: string) {
    return this.http.delete(`${this.base}/api/Admins/Delete/${id}`, {
      headers: this.headers()
    });
  }

  // ================= PROFILE =================
  getAdminProfile() {
    return this.http.get(`${this.base}/api/admins/admin/profile`, {
      headers: this.headers()
    });
  }

  updateAdmin(id: string, body: any) {
    return this.http.put(`${this.base}/api/admins/${id}/profile`, body, {
      headers: this.headers()
    });
  }

    getAdminById(id: string) {
    return this.http.get(`${this.base}/api/Admins/${id}`, {
      headers: this.headers()
    });
  }

}
