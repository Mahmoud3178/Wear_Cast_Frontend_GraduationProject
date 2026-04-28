import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AllCustomersForAdminService {

  private baseUrl = `${environment.apiUrl}/api/admin/customers`;

  constructor(private http: HttpClient) {}

  getAllCustomers(pageIndex = 1, pageSize = 5, searchTerm = '') {

    let params = new HttpParams()
      .set('PageIndex', pageIndex)
      .set('PageSize', pageSize);

    if (searchTerm) {
      params = params.set('SearchTerm', searchTerm);
    }

    return this.http.get(`${this.baseUrl}/all`, { params });
  }
  getCustomerById(id: number) {
  return this.http.get('/api/customers/profile', {
    params: { ProvidedCustomerId: id }
  });
}
}
