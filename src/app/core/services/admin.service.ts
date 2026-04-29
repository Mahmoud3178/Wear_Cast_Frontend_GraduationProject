import { HttpClient, HttpParams,HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  private baseUrl = `${environment.apiUrl}/api/FixedProduct`;
  private orderUrl = `${environment.apiUrl}/api/Orders`;
  private customerUrl = `${environment.apiUrl}/api/admin/customers`;
  private shippingUrl = `${environment.apiUrl}/api/admin/shipping-companies`;

  constructor(private http: HttpClient) {}

  // 🔹 Get All Customers (Admin)
  getAllCustomers(pageIndex = 1, pageSize = 10, searchTerm?: string) {
    let params = new HttpParams()
      .set('PageIndex', pageIndex)
      .set('PageSize', pageSize);

    if (searchTerm) {
      params = params.set('SearchTerm', searchTerm);
    }

    return this.http.get(`${this.customerUrl}`, {
      params,
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.getToken()}`
      })
    });
  }

  // 🔹 Get All Shipping Companies (Admin)
  getAllShippingCompanies(pageIndex = 1, pageSize = 10) {
    let params = new HttpParams()
      .set('PageIndex', pageIndex)
      .set('PageSize', pageSize);

    return this.http.get(`${this.shippingUrl}`, {
      params,
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.getToken()}`
      })
    });
  }

  // 🔹 Get All Sellers (Admin)
  getAllSellers(pageIndex = 1, pageSize = 10) {
    let params = new HttpParams()
      .set('PageIndex', pageIndex)
      .set('PageSize', pageSize);

    return this.http.get(`${environment.apiUrl}/api/admin/sellers`, {
      params,
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.getToken()}`
      })
    });
  }

  // 🔹 Get Seller By Id (Admin)
  getSellerById(id: string) {
    return this.http.get(`${environment.apiUrl}/api/admin/sellers/${id}`, {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.getToken()}`
      })
    });
  }

  // 🔹 Get All Products
  getAllProducts(pageIndex = 1, pageSize = 10, searchTerm?: string) {
    let params = new HttpParams()
      .set('PageIndex', pageIndex)
      .set('PageSize', pageSize);

    if (searchTerm) {
      params = params.set('SearchTerm', searchTerm);
    }

    return this.http.get(`${this.baseUrl}/GetAll`, { params });
  }

  // 🔹 Get Product Details
getProductById(id: number, colorId?: number) {

  let params = new HttpParams();

  if (colorId) {
    params = params.set('colorId', colorId);
  }

  return this.http.get(
    `${this.baseUrl}/GetDetailsById/${id}`,
    { params }
  );
}
private getToken(): string {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user?.token || '';
}

mapOrder(o: any) {
  return {
    id: o.id,
    recipientName: o.recipientName || '',
    recipientEmail: o.recipientEmail || '',   // ❗ لو موجود في API لاحقًا
    recipientPhoneNumber: o.recipientPhoneNumber || '',
    totalAmount: o.totalAmount || 0,
    status: o.status || 'Unknown',
    createdOn: o.createdOn,

    orderType: o.orderType,

    shippingAddress: o.shippingAddress
      ? `${o.shippingAddress.street}, ${o.shippingAddress.city}, ${o.shippingAddress.state}`
      : '',

    items: []
  };
}
    // 🔹 Get All Orders (Admin)
getAllOrders(pageNumber = 1, pageSize = 10, statusFilter?: number) {
  let params = new HttpParams()
    .set('pageNumber', pageNumber)
    .set('pageSize', pageSize);

  if (statusFilter != null) {
    params = params.set('statusFilter', statusFilter);
  }

  return this.http.get(`${this.orderUrl}/GetAllByID`, {
    params,
    headers: new HttpHeaders({
      Authorization: `Bearer ${this.getToken()}`
    })
  });
}
  // 🔹 Get Order Items (Details)
getOrderItems(orderId: number) {
  return this.http.get(`${this.orderUrl}/${orderId}/items`, {
    headers: new HttpHeaders({
      Authorization: `Bearer ${this.getToken()}`
    })
  });
}

  // 🔹 Update Order Status
  updateOrderStatus(orderId: number, status: number) {
    const token = localStorage.getItem('token') || '';

    return this.http.put(
      `${this.orderUrl}/${orderId}/status`,
      { status }, // 👈 مهم جدًا
      {
        headers: new HttpHeaders({
          Authorization: `Bearer ${token}`
        })
      }
    );
  }
}
