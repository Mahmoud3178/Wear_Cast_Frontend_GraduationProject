import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ShippingCompanyForAdminService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ✅ Get company profile
  getCompanyProfile(id: number) {
    return this.http.get(`${this.baseUrl}/api/shipping-companies/profile`, {
      params: { ProvidedCompanyId: id }
    });
  }

  // ✅ Update profile
  updateCompanyProfile(body: any) {
    return this.http.put(`${this.baseUrl}/api/shipping-companies/profile`, body);
  }

  // ✅ Upload logo
  updateLogo(companyId: number, file: File) {
    const formData = new FormData();
    formData.append('NewLogo', file);
    formData.append('ProvidedShippingCompanyId', companyId.toString());

    return this.http.put(`${this.baseUrl}/api/shipping-companies/profile-image`, formData);
  }
createCompany(formData: FormData) {
  return this.http.post(
    `${this.baseUrl}/api/shipping-companies`,
    formData
  );
}
  // DELETE SHIPPING COMPANY
deleteCompany(id: number, reason: string) {
  const body = {
    reason: reason
  };

  return this.http.delete(`${this.baseUrl}/api/shipping-companies/${id}`, {
    body
  });
}
getCompanyWallet(id: number) {
  return this.http.get(`${this.baseUrl}/api/shipping-companies/wallet`, {
    params: { id }
  });
}
}
