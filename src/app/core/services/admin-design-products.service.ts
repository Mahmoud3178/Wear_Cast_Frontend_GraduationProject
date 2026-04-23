import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminDesignProductsService {

  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  // 🔹 Get all designed products
  getAllDesignedProducts(
    pageIndex = 1,
    pageSize = 10,
    searchTerm?: string,
    categoryId?: number
  ) {
    let params = new HttpParams()
      .set('PageIndex', pageIndex)
      .set('PageSize', pageSize);

    if (searchTerm) params = params.set('SearchTerm', searchTerm);
    if (categoryId) params = params.set('CategoryId', categoryId);

    return this.http.get(
      `${this.base}/api/factories/catalog/designed-products`,
      { params }
    );
  }

  // 🔹 Details
  getDesignedProductById(id: number, colorId?: number) {
    let params = new HttpParams();

    if (colorId) {
      params = params.set('colorId', colorId);
    }

    return this.http.get(
      `${this.base}/api/catalog/designed-products/${id}`,
      { params }
    );
  }
}
