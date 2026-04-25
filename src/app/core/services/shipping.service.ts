import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Shipment, ShipmentDetails, AssignShipmentRequest, ShipmentStatus } from '../models/shipment.model';
import { Driver, DriverStatus } from '../models/driver.model';
import { ShippingDashboardStats } from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class ShippingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api`;

  // Shipments
  getAllShipments(): Observable<Shipment[]> {
    return this.http.get<Shipment[]>(`${this.apiUrl}/Shipments`);
  }

  getShipmentById(id: number): Observable<ShipmentDetails> {
    return this.http.get<ShipmentDetails>(`${this.apiUrl}/Shipments/${id}`);
  }

  assignDriver(request: AssignShipmentRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/Shipments/${request.shipmentId}/assign`, request);
  }

  // Dashboard calculations
  getDashboardStats(shipments: Shipment[], drivers: Driver[]): ShippingDashboardStats {
    const activeDrivers = drivers.filter(d => d.status === DriverStatus.Busy).length;
    const pendingDeliveries = shipments.filter(s => 
      s.shipmentStatus === ShipmentStatus.Pending || 
      s.shipmentStatus === ShipmentStatus.ReadyForPickup
    ).length;
    const totalRevenue = shipments.reduce((sum, s) => sum + (s.price || 0), 0);

    return {
      totalShipments: shipments.length,
      activeDrivers,
      totalRevenue,
      pendingDeliveries
    };
  }

  getRecentShipments(shipments: Shipment[], limit: number = 5): Shipment[] {
    // Assuming we want the latest based on orderTime
    return [...shipments]
      .sort((a, b) => new Date(b.orderTime).getTime() - new Date(a.orderTime).getTime())
      .slice(0, limit);
  }
}
