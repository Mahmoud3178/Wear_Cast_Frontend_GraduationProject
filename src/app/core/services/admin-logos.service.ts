import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminLogosService {

  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  private getToken() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user?.token || '';
  }

  // ================= LOGOS =================

  getAssets(categoryId?: number, pageIndex = 1, pageSize = 20) {

    let url = `${this.base}/api/design-assets`;

    if (categoryId) {
      url += `/category/${categoryId}`;
    }

    const params = new HttpParams()
      .set('pageIndex', pageIndex.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get(url, { params });
  }

  createLogo(formData: FormData) {
    return this.http.post(`${this.base}/api/admin/design-assets`, formData, {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.getToken()}`
      })
    });
  }

  updateLogo(id: number, formData: FormData) {
    return this.http.put(`${this.base}/api/admin/design-assets/${id}`, formData, {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.getToken()}`
      })
    });
  }

  deleteLogo(id: number) {
    return this.http.delete(`${this.base}/api/admin/design-assets/${id}`, {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.getToken()}`
      })
    });
  }

  // ================= CATEGORY =================

  getCategories() {
    return this.http.get(`${this.base}/api/assets-categories`);
  }

  addCategory(body: any) {
    return this.http.post(`${this.base}/api/assets-categories`, body, {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.getToken()}`
      })
    });
  }

  updateCategory(id: number, body: any) {
    return this.http.put(`${this.base}/api/assets-categories/${id}`, body, {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.getToken()}`
      })
    });
  }

  deleteCategory(id: number) {
    return this.http.delete(`${this.base}/api/assets-categories/${id}`, {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.getToken()}`
      })
    });
  }
}
