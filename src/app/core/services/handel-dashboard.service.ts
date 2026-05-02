import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HandelDashboardService {

  private base = `${environment.apiUrl}/api/platform`;

  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = JSON.parse(localStorage.getItem('user') || '{}')?.token;

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  // 🔹 Dashboard
  getDashboard() {
    return this.http.get(`${this.base}/dashboard`, {
      headers: this.getHeaders()
    });
  }

  // 🔹 GET Commission
  getCommission() {
    return this.http.get(`${this.base}/commission`, {
      headers: this.getHeaders()
    });
  }

  // 🔥 UPDATE Commission
  updateCommission(value: number) {
    return this.http.put(`${this.base}/commission`,
      {
        commissionPercentage: value
      },
      {
        headers: this.getHeaders()
      }
    );
  }
}
