import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SallerProfileService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

getMyProfile() {
  const token = localStorage.getItem('token') || '';

  return this.http.get(`${this.baseUrl}/api/sellers/profile`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

  // ✅ Update Profile (الشكل الصح حسب Swagger)
updateProfile(data: any) {

    const body = {
      name: data.name,
      email: data.email,
      phoneNumber: data.phone,

      commercialRegisterNumber: data.commercialRegisterNumber,
      taxIdNumber: data.taxIdNumber, // ✅ أهم سطر

      description: data.description,

      address: {
        state: data.state || 'Egypt',
        city: data.city,
        street: data.address,
        buildingNumber: data.buildingNumber
      },

      providedSellerId: data.id
    };

    return this.http.put(`${this.baseUrl}/api/sellers/profile`, body);
  }

  // ✅ Upload Logo
  uploadLogo(file: File, sellerId: number) {
    const formData = new FormData();
    formData.append('NewLogo', file);
    formData.append('ProvidedSellerId', sellerId.toString());

    return this.http.put(`${this.baseUrl}/api/sellers/profile-image`, formData);
  }
changePassword(data: any) {
  const token = localStorage.getItem('token') || '';

  return this.http.put(
    'https://wear-cast.runasp.net/me/change-password',
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
}
}
