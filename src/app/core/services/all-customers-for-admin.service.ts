import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AllCustomersForAdminService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ================= GET ALL =================
  getAllCustomers(pageIndex = 1, pageSize = 5, searchTerm = '') {

    let params = new HttpParams()
      .set('PageIndex', pageIndex)
      .set('PageSize', pageSize);

    if (searchTerm) {
      params = params.set('SearchTerm', searchTerm);
    }

    return this.http.get(`${this.baseUrl}/api/admin/customers/all`, { params });
  }

  // ================= GET BY ID =================
  getCustomerById(id: number) {
    return this.http.get(`${this.baseUrl}/api/customers/profile`, {
      params: { ProvidedCustomerId: id }
    });
  }

  // ================= UPDATE =================
updateCustomer(id: number, body: any) {
  return this.http.put(`${this.baseUrl}/api/customers/profile`, {
    providedCustomerId: id,
    ...body
  });
}

  // ================= DELETE ================= ✅ FIXED
deleteCustomer(id: number, body: any) {
  return this.http.delete(`${this.baseUrl}/api/customers/${id}`, {
    body
  });
}
  // ================= IMAGE =================

  updateCustomerImage(id: number, file: File) {
    const formData = new FormData();
    formData.append('NewImage', file);
    formData.append('ProvidedCustomerId', id.toString());

    return this.http.put(`${this.baseUrl}/api/customers/profile-image`, formData);
  }

  deleteCustomerImage(id: number) {
    return this.http.delete(`${this.baseUrl}/api/customers/profile-image`, {
      params: { ProvidedCustomerId: id }
    });
  }

  // ================= ORDERS =================
  getCustomerOrders(id: number) {
    return this.http.get(`${this.baseUrl}/api/customers/orders`, {
      params: { customerId: id }
    });
  }
}
