import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  ShippingCompany, 
  CreateShippingCompanyRequest, 
  UpdateShippingCompanyRequest,
  ShippingCompanyManager,
  CreateManagerRequest,
  UpdateManagerRequest
} from '../models/shipping-company.model';

@Injectable({
  providedIn: 'root'
})
export class ShippingCompanyService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api`;

  // --- Shipping Company ---
  getCompany(): Observable<ShippingCompany> {
    return this.http.get<ShippingCompany>(`${this.apiUrl}/shipping-companies/profile`);
  }

  createCompany(request: CreateShippingCompanyRequest): Observable<void> {
    const formData = new FormData();
    Object.keys(request).forEach(key => {
      const value = (request as any)[key];
      if (value !== null && value !== undefined) {
        if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, value.toString());
        }
      }
    });
    return this.http.post<void>(`${this.apiUrl}/shipping-companies`, formData);
  }

  updateCompany(request: UpdateShippingCompanyRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/shipping-companies/profile`, request);
  }

  updateCompanyImage(formData: FormData): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/shipping-companies/profile-image`, formData);
  }

  // --- Shipping Company Manager ---
  getManager(): Observable<ShippingCompanyManager> {
    return this.http.get<ShippingCompanyManager>(`${this.apiUrl}/shipping-company-managers/profile`);
  }

  createManager(request: CreateManagerRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/shipping-company-managers`, request);
  }

  updateManager(request: UpdateManagerRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/shipping-company-managers/profile`, request);
  }
}
