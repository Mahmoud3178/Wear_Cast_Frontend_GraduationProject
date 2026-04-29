import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HandelCategoryesForAdminService {

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

  // ================= ASSETS =================

  getAssetCategories() {
    return this.http.get(`${this.base}/api/assets-categories`);
  }

  addAssetCategory(body: any) {
    return this.http.post(`${this.base}/api/assets-categories`, body, {
      headers: this.headers()
    });
  }

  updateAssetCategory(id: number, body: any) {
    return this.http.put(`${this.base}/api/assets-categories/${id}`, body, {
      headers: this.headers()
    });
  }

  deleteAssetCategory(id: number) {
    return this.http.delete(`${this.base}/api/assets-categories/${id}`, {
      headers: this.headers()
    });
  }

  // ================= PRODUCTS =================

  getProductCategories() {
    return this.http.get(`${this.base}/api/Category/GetAllCategories`);
  }

  addProductCategory(formData: FormData) {
    return this.http.post(`${this.base}/api/Category/CreateCategory`, formData, {
      headers: this.headers()
    });
  }

  updateProductCategory(id: number, formData: FormData) {
    return this.http.put(`${this.base}/api/Category/UpdateCategory?id=${id}`, formData, {
      headers: this.headers()
    });
  }

  deleteProductCategory(id: number) {
    return this.http.delete(`${this.base}/api/Category/DeleteCategory/${id}`, {
      headers: this.headers()
    });
  }
}
