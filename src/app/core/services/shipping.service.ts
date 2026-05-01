import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Shipment, ShipmentDetails, AssignShipmentRequest, ShipmentStatus } from '../models/shipment.model';
import { Driver, DriverStatus } from '../models/driver.model';
import { ShippingDashboardStats } from '../models/dashboard.model';
import { PaginatedResponse } from '../models/pagination.model';

@Injectable({
  providedIn: 'root'
})
export class ShippingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api`;

  // Stats
  getShippingStats(): Observable<ShippingDashboardStats> {
    return this.http.get<ShippingDashboardStats>(`${this.apiUrl}/Shipments/stats`);
  }

  // Shipments
  getAllShipments(): Observable<Shipment[]> {
    return this.http.get<PaginatedResponse<Shipment>>(`${this.apiUrl}/Shipments`).pipe(
      map(response => response.items || [])
    );
  }

  getShipmentById(id: number): Observable<ShipmentDetails> {
    return this.http.get<ShipmentDetails>(`${this.apiUrl}/Shipments/${id}`);
  }

  assignDriver(request: AssignShipmentRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/Shipments/${request.shipmentId}/assign`, request);
  }

  // Dashboard calculations
  getDashboardStats(shipments: Shipment[], drivers: Driver[]): ShippingDashboardStats {
    const activeDrivers = drivers.filter(d => {
      const status = typeof d.status === 'string' ? DriverStatus[d.status as keyof typeof DriverStatus] : d.status;
      return status === DriverStatus.Available;
    }).length;

    const pendingDeliveries = shipments.filter(s => {
      const status = typeof s.shipmentStatus === 'string' ? ShipmentStatus[s.shipmentStatus as keyof typeof ShipmentStatus] : s.shipmentStatus;
      return status === ShipmentStatus.Pending || 
             status === ShipmentStatus.Unassigned ||
             status === ShipmentStatus.Assigned ||
             status === ShipmentStatus.PickingUp ||
             status === ShipmentStatus.OutForDelivery;
    }).length;
    const totalRevenue = shipments.reduce((sum, s) => sum + (s.price || 0), 0);

    return {
      totalShipments: shipments.length,
      activeDrivers,
      totalRevenue,
      pendingDeliveries,
      totalShipmentsGrowth: 0,
      activeDriversGrowth: 0,
      totalRevenueGrowth: 0,
      pendingDeliveriesGrowth: 0,
      monthlyRevenue: [],
      statusBreakdown: {}
    };
  }

  getRecentShipments(shipments: Shipment[], limit: number = 5): Shipment[] {
    // Assuming we want the latest based on orderTime
    return [...shipments]
      .sort((a, b) => new Date(b.orderTime).getTime() - new Date(a.orderTime).getTime())
      .slice(0, limit);
  }
}
