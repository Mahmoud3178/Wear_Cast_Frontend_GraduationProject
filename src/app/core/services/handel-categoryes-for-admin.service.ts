import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HandelCategoryesForAdminService {

  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private headers() {
    return new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`
    });
  }

  private handleError(err: any) {
    const body = err?.error;
    if (body?.error?.description) return throwError(() => new Error(body.error.description));
    if (body?.validationErrors) {
      const msgs = Object.values(body.validationErrors).join(', ');
      return throwError(() => new Error(msgs));
    }
    if (body?.message) return throwError(() => new Error(body.message));
    if (typeof body === 'string' && body.length < 300) return throwError(() => new Error(body));
    return throwError(() => new Error(`Request failed (${err.status})`));
  }

  // ================= ASSETS =================

  getAssetCategories() {
    return this.http.get(`${this.base}/api/assets-categories`);
  }

  addAssetCategory(body: any) {
    return this.http.post(`${this.base}/api/assets-categories`, body, {
      headers: this.headers()
    }).pipe(catchError(e => this.handleError(e)));
  }

  updateAssetCategory(id: number, body: any) {
    return this.http.put(`${this.base}/api/assets-categories/${id}`, body, {
      headers: this.headers()
    }).pipe(catchError(e => this.handleError(e)));
  }

  deleteAssetCategory(id: number) {
    return this.http.delete(`${this.base}/api/assets-categories/${id}`, {
      headers: this.headers()
    }).pipe(catchError(e => this.handleError(e)));
  }

  // ================= PRODUCTS =================

  getProductCategories() {
    return this.http.get(`${this.base}/api/Category/GetAllCategories`);
  }

  addProductCategory(formData: FormData) {
    return this.http.post(`${this.base}/api/Category/CreateCategory`, formData, {
      headers: this.headers()
    }).pipe(catchError(e => this.handleError(e)));
  }

  updateProductCategory(id: number, formData: FormData) {
    return this.http.put(`${this.base}/api/Category/UpdateCategory?id=${id}`, formData, {
      headers: this.headers()
    }).pipe(catchError(e => this.handleError(e)));
  }

  deleteProductCategory(id: number) {
    return this.http.delete(`${this.base}/api/Category/DeleteCategory/${id}`, {
      headers: this.headers()
    }).pipe(catchError(e => this.handleError(e)));
  }
}
