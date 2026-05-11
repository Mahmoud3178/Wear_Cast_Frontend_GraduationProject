import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardSellerService {
  constructor(private http: HttpClient) {}

  getStats() {
    return this.http.get(`${environment.apiUrl}/api/sellers/dashboard-stats`);
  }
}
