import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

getAssets(categoryId?: number, pageIndex = 1, pageSize = 20) {

  if (categoryId === null || categoryId === undefined) {
    return this.http.get(`${this.base}/api/design-assets`, {
      params: { pageIndex, pageSize }
    });
  }

  return this.http.get(`${this.base}/api/design-assets/category/${categoryId}`, {
    params: { pageIndex, pageSize }
  });
}

  // 🔹 Get categories
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
  // 🔹 Create logo
  createLogo(formData: FormData) {
    return this.http.post(`${this.base}/api/admin/design-assets`, formData, {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.getToken()}`
      })
    });
  }

  // 🔹 Update logo
  updateLogo(id: number, formData: FormData) {
    return this.http.put(`${this.base}/api/admin/design-assets/${id}`, formData, {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.getToken()}`
      })
    });
  }

  // 🔹 Delete logo
  deleteLogo(id: number) {
    return this.http.delete(`${this.base}/api/admin/design-assets/${id}`, {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.getToken()}`
      })
    });
  }

  // 🔹 Get single asset
  getLogoById(id: number) {
    return this.http.get(`${this.base}/api/design-assets/${id}`);
  }
}
