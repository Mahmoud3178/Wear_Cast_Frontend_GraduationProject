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
createProductColor(formData: FormData, token?: string): Observable<any> {
  const headers: any = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return this.http.post(
    `${this.api}/api/FixedProductColor/CreateProductColor`,
    formData,
    { headers }
  );
}

  // 🔹 Update Product
  update(data: any): Observable<any> {
    return this.http.put(`${this.api}/api/FixedProduct/Update`, data);
  }

  // 🔹 Delete Product
  delete(data: any): Observable<any> {
    return this.http.delete(`${this.api}/api/FixedProduct/Delete`, { body: data });
  }

  // 🔹 Get Seller Products
getSellerProducts(pageIndex = 1, pageSize = 1000): Observable<any> {
  const token = localStorage.getItem('token') || '';
  return this.http.get(
    `${this.api}/api/FixedProduct/GetAllFixedProductsForSeller`,
    {
      params: { PageIndex: pageIndex, PageSize: pageSize },
      headers: { Authorization: `Bearer ${token}` }
    }
  );
}

getSellerProductsStatus(): Observable<any> {
  const token = localStorage.getItem('token') || '';
  return this.http.get(
    `${this.api}/api/FixedProduct/GetAllFixedProductsStatusForSeller`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
}

// 🔹 Get Product Details (full with colors)
getDetails(id: number): Observable<any> {
  return this.http.get(`${this.api}/api/FixedProduct/GetDetailsById/${id}`);
}

// 🔹 Update Color
updateColor(formData: FormData): Observable<any> {
  return this.http.put(`${this.api}/api/FixedProductColor/UpdateColor`, formData);
}

// 🔹 Delete Color
deleteColor(colorId: number): Observable<any> {
  return this.http.delete(`${this.api}/api/FixedProductColor/DeleteColor/${colorId}`);
}

// 🔹 Add Image to Color
addImage(formData: FormData): Observable<any> {
  return this.http.post(`${this.api}/api/FixedProductColor/AddImage`, formData);
}

// 🔹 Delete Image
deleteImage(imageId: number): Observable<any> {
  return this.http.delete(`${this.api}/api/FixedProductColor/DeleteImage/${imageId}`);
}

// 🔹 Adjust Size Quantity
adjustSizeQuantity(data: any): Observable<any> {
  return this.http.post(`${this.api}/api/FixedProductColor/AdjustSizeQuantity`, data);
}
}
