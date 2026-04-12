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
}
