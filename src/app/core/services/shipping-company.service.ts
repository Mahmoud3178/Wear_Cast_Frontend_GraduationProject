import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  ShippingCompany, 
  CreateShippingCompanyRequest, 
  UpdateShippingCompanyRequest,
  ShippingCompanyManager,
  CreateManagerRequest,
  UpdateManagerRequest,
  ShippingCompanyDashboardResponse,
  WalletResponse
} from '../models/shipping-company.model';

@Injectable({
  providedIn: 'root'
})
export class ShippingCompanyService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api`;

  // --- Shipping Company ---
  getCompany(): Observable<ShippingCompany> {
    return this.http.get<any>(`${this.apiUrl}/shipping-companies/profile`).pipe(
      map(res => res.data)
    );
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
    return this.http.get<any>(`${this.apiUrl}/shipping-company-managers/profile`).pipe(
      map(res => res.data)
    );
  }

  createManager(request: CreateManagerRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/shipping-company-managers`, request);
  }

  updateManager(request: UpdateManagerRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/shipping-company-managers/profile`, request);
  }

  // --- Shipping Company Dashboard ---
  getDashboard(): Observable<ShippingCompanyDashboardResponse> {
    return this.http.get<ShippingCompanyDashboardResponse>(`${this.apiUrl}/ShippingCompany/Dashboard`);
  }

  // --- Shipping Company Wallet ---
  getWallet(): Observable<WalletResponse> {
    return this.http.get<WalletResponse>(`${this.apiUrl}/shipping-companies/wallet`);
  }

  // --- Shipping Company Orders (Requests Pipeline) ---
  getOrders(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<any>(`${this.apiUrl}/ShippingCompany/Orders`, { params: httpParams });
  }

  getOrderDetails(orderId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Orders/${orderId}/items`);
  }

  getAllManagers(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/shipping-company-managers/all`);
  }

  deleteManager(managerId: number, reason: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/shipping-company-managers/${managerId}`, {
      body: { reason }
    });
  }
}


