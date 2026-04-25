import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Driver, CreateDriverRequest, UpdateDriverRequest, UpdateDriverStatusRequest, DriverProfile } from '../models/driver.model';
import { DriverShipment, DriverShipmentDetails, UpdateShipmentStatusRequest, ShipmentStatus } from '../models/shipment.model';
import { DriverDashboardStats } from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DriverService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api`;

  // --- Drivers (Admin/Manager) ---
  getAllDrivers(): Observable<Driver[]> {
    return this.http.get<Driver[]>(`${this.apiUrl}/Drivers/GetAll`);
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

  // --- Driver Shipments ---
  getAllDriverShipments(): Observable<DriverShipment[]> {
    return this.http.get<DriverShipment[]>(`${this.apiUrl}/DriverShipments`);
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
    const todayDeliveries = shipments.filter(s => 
      s.shipmentStatus === ShipmentStatus.Delivered && 
      new Date(s.orderTime).toDateString() === today
    ).length;

    const completedDeliveries = shipments.filter(s => s.shipmentStatus === ShipmentStatus.Delivered).length;
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
    const active = shipments.find(s => s.shipmentStatus === ShipmentStatus.InTransit);
    if (active) return active;
    
    return shipments.find(s => s.shipmentStatus === ShipmentStatus.ReadyForPickup) || null;
  }
}
