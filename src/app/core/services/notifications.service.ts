import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationsService {

  private api = `${environment.apiUrl}/api/Notifications`;

  constructor(private http: HttpClient) {}

  private get token() {
    return localStorage.getItem('token') || '';
  }

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  getAll(pageIndex = 1, pageSize = 20, notificationType?: number) {
    let params = new HttpParams()
      .set('PageIndex', pageIndex)
      .set('PageSize', pageSize);
    if (notificationType !== undefined)
      params = params.set('NotificationType', notificationType);
    return this.http.get(`${this.api}/GetAll`, { params, headers: this.headers });
  }

  getUndeliveredCount() {
    return this.http.get(`${this.api}/UndeliveredCount`, { headers: this.headers });
  }

  markAsRead(notificationId: number) {
    return this.http.put(`${this.api}/Read/${notificationId}`, {}, { headers: this.headers });
  }

  markAllAsRead() {
    return this.http.put(`${this.api}/ReadAll`, {}, { headers: this.headers });
  }

  receiveAll() {
    return this.http.put(`${this.api}/ReceiveAll`, {}, { headers: this.headers });
  }

  delete(id: number) {
    return this.http.delete(`${this.api}/Delete/${id}`, { headers: this.headers });
  }
}
