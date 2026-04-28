import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // 🔹 Get All Products
getAll(
  pageIndex = 1,
  pageSize = 100,
  searchTerm: string = '',
  categoryId?: number,
  minPrice?: number,
  maxPrice?: number
): Observable<any> {

  let params: any = {
    PageIndex: pageIndex,
    PageSize: pageSize
  };

  if (searchTerm) params.SearchTerm = searchTerm;
  if (categoryId) params.CategoryId = categoryId;
  if (minPrice) params.MinPrice = minPrice;
  if (maxPrice) params.MaxPrice = maxPrice;

  return this.http.get(`${this.api}/api/FixedProduct/GetAll`, { params });
}

  // 🔹 Get Product By Id
  getById(id: number): Observable<any> {
    return this.http.get(`${this.api}/api/FixedProduct/GetById/${id}`);
  }

  // 🔹 Create Product
  create(data: any): Observable<any> {
    return this.http.post(`${this.api}/api/FixedProduct/Create`, data);
  }

  // 🔹 Get All Categories
  getCategories(): Observable<any> {
    return this.http.get(`${this.api}/api/Category/GetAllCategories`);
  }

  // 🔹 Get Product Colors
  getColors(productId: number): Observable<any> {
    return this.http.get(`${this.api}/api/FixedProductColor/GetAllColorByProductId/${productId}`);
  }

  // 🔹 Create Product Color
  createProductColor(formData: FormData): Observable<any> {
    return this.http.post(`${this.api}/api/FixedProductColor/CreateProductColor`, formData);
  }

  // 🔹 Update Product
  update(data: any): Observable<any> {
    return this.http.put(`${this.api}/api/FixedProduct/Update`, data);
  }

  // 🔹 Delete Product
  delete(data: any): Observable<any> {
    return this.http.delete(`${this.api}/api/FixedProduct/Delete`, { body: data });
  }
}
