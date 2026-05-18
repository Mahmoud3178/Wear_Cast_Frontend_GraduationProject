import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
  getAllShipments(params?: any): Observable<PaginatedResponse<Shipment>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<PaginatedResponse<Shipment>>(`${this.apiUrl}/Shipments`, { params: httpParams });
  }

  getShipmentById(id: number): Observable<ShipmentDetails> {
    return this.http.get<ShipmentDetails>(`${this.apiUrl}/Shipments/${id}`);
  }

  getOrdersByShipmentId(shipmentId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Orders/shipment/${shipmentId}`);
  }

  getShipmentOrderItems(shipmentId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Orders/shipment/${shipmentId}/items`);
  }

  assignDriver(request: AssignShipmentRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/Shipments/${request.shipmentId}/assign`, request);
  }

  updateShipmentStatus(shipmentId: number, newStatus: number, deliveryCode?: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/Shipments/${shipmentId}/status`, {
      newStatus,
      deliveryCode
    });
  }

  updateOrderStatus(orderId: number, newStatus: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/Orders/${orderId}/status`, {
      newStatus
    });
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
