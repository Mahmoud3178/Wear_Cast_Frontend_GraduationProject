import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Driver, DriverStatus, CreateDriverRequest, UpdateDriverStatusRequest, DriverProfile, UpdateDriverRequest } from '../models/driver.model';
import { ShippingStats } from '../models/shipping-stats.model';
import { DriverShipment, DriverShipmentDetails, UpdateShipmentStatusRequest, ShipmentStatus } from '../models/shipment.model';
import { DriverDashboardStats } from '../models/dashboard.model';
import { PaginatedResponse } from '../models/pagination.model';

@Injectable({
  providedIn: 'root'
})
export class DriverService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api`;

  // --- Drivers (Admin/Manager) ---
  getAllDrivers(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<any>(`${this.apiUrl}/Drivers/GetAll`, { params: httpParams });
  }

  getShippingStats(): Observable<ShippingStats> {
    return this.http.get<ShippingStats>(`${this.apiUrl}/Shipments/stats`);
  }

  getDriverById(id: number): Observable<DriverProfile> {
    return this.http.get<DriverProfile>(`${this.apiUrl}/Drivers/${id}/GetById`);
  }

  createDriver(request: CreateDriverRequest): Observable<void> {
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
    return this.http.post<void>(`${this.apiUrl}/drivers/create`, formData);
  }

  updateDriver(request: UpdateDriverRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/drivers/profile`, request);
  }

  changeDriverStatus(id: number, request: UpdateDriverStatusRequest): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/Drivers/${id}/ChangeStatus`, request);
  }

  updateProfileImage(formData: FormData): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/drivers/profile-image`, formData);
  }

  deleteDriver(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/Drivers/${id}`);
  }

  // --- Driver Shipments ---
  getAllDriverShipments(driverId: number, status?: string): Observable<DriverShipment[]> {
    let params = new HttpParams().set('DriverId', driverId.toString());
    if (status) {
      params = params.set('ShipmentStatus', status);
    }
    return this.http.get<PaginatedResponse<DriverShipment>>(`${this.apiUrl}/DriverShipments`, { params }).pipe(
      map(response => response.items || [])
    );
  }

  getDriverShipmentById(id: number): Observable<DriverShipmentDetails> {
    return this.http.get<DriverShipmentDetails>(`${this.apiUrl}/drivers/shipments/${id}`);
  }

  updateShipmentStatus(id: number, request: UpdateShipmentStatusRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/Shipments/${id}/status`, request);
  }

  // Dashboard calculations
  getDashboardStats(shipments: DriverShipment[]): DriverDashboardStats {
    const today = new Date().toDateString();
    const todayDeliveries = shipments.filter(s => {
      const status = typeof s.shipmentStatus === 'string' ? ShipmentStatus[s.shipmentStatus as keyof typeof ShipmentStatus] : s.shipmentStatus;
      return status === ShipmentStatus.Delivered && 
             new Date(s.orderTime).toDateString() === today;
    }).length;

    const completedDeliveries = shipments.filter(s => {
      const status = typeof s.shipmentStatus === 'string' ? ShipmentStatus[s.shipmentStatus as keyof typeof ShipmentStatus] : s.shipmentStatus;
      return status === ShipmentStatus.Delivered;
    }).length;
    
    // We don't have earnings in DTO, mock it based on completed
    const totalEarnings = completedDeliveries * 15.5; 

    return {
      todayDeliveries,
      totalEarnings,
      completedDeliveries,
      activeHours: '8h 30m' // Mocked for now
    };
  }

  getCurrentRoute(shipments: DriverShipment[]): DriverShipment | null {
    const active = shipments.find(s => {
      const status = typeof s.shipmentStatus === 'string' ? ShipmentStatus[s.shipmentStatus as keyof typeof ShipmentStatus] : s.shipmentStatus;
      return status === ShipmentStatus.OutForDelivery;
    });
    if (active) return active;
    
    return shipments.find(s => {
      const status = typeof s.shipmentStatus === 'string' ? ShipmentStatus[s.shipmentStatus as keyof typeof ShipmentStatus] : s.shipmentStatus;
      return status === ShipmentStatus.PickingUp;
    }) || null;
  }
}
