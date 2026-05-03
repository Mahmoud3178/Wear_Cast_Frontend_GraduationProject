import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AddressDto {
  country?: string;
  state?: string;
  city?: string;
  street?: string;
  buildingNumber?: string;
}

export interface UpdateCustomerRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: AddressDto;
  providedCustomerId?: number | null;
}

export interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
}

export interface CustomerWalletSummary {
  balance: number;
}

@Injectable({ providedIn: 'root' })
export class CustomerProfileService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/api/customers/profile`);
  }

  updateProfile(body: UpdateCustomerRequest): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/api/customers/profile`, body);
  }

  changePassword(body: ChangePasswordRequest): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/me/change-password`, body);
  }

  updateProfileImage(file: File, providedCustomerId?: number | null): Observable<any> {
    const formData = new FormData();
    formData.append('NewImage', file);
    if (providedCustomerId != null) {
      formData.append('ProvidedCustomerId', String(providedCustomerId));
    }
    return this.http.put<any>(`${this.apiUrl}/api/customers/profile-image`, formData);
  }

  deleteProfileImage(providedCustomerId?: number | null): Observable<any> {
    let url = `${this.apiUrl}/api/customers/profile-image`;
    if (providedCustomerId != null) {
      url += `?ProvidedCustomerId=${encodeURIComponent(String(providedCustomerId))}`;
    }
    return this.http.delete<any>(url);
  }

  getWallet(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/api/customers/wallet`);
  }
}
