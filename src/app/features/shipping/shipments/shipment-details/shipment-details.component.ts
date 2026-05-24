import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { DriverService } from '../../../../core/services/driver.service';

// ─── Interfaces matching actual backend DTOs ────────────────────────────────

export interface AddressDto {
  state?: string | null;
  city?: string | null;
  street?: string | null;
  buildingNumber?: string | null;
}

/** GET /api/Shipments/{id} */
export interface AdminShipmentDetail {
  id: number;
  deliveryAddress?: AddressDto | null;
  price?: number | null;
  shipmentStatus: string;
  orderTime?: string | null;
  readyForPickupAt?: string | null;
  tripStartedAt?: string | null;
  outForDeliveryAt?: string | null;
  deliveredAt?: string | null;
  deliveryCode?: string | null;
  driverId?: number | null;
  driverName?: string | null;
  driverPhoneNumber?: string | null;
  driverNationalId?: string | null;
  customerId?: number | null;
  customerName?: string | null;
  customerPhoneNumber?: string | null;
}

/** GET /api/Shipments/{id}/Orders (array item) */
export interface ShipmentOrderDto {
  orderId: number;
  orderType?: string | null;
  vendorName?: string | null;
  vendorAddress?: AddressDto | null;
  vendorPhoneNumber?: string | null;
  orderStatus?: string | null;
  numberOfItems?: number | null;
}

export interface DriverItem {
  id: number;
  driverName?: string | null;
  name?: string | null;
  status: any;
  driverCity?: string | null;
}

@Component({
  selector: 'app-shipping-shipment-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './shipment-details.component.html',
  styleUrl: './shipment-details.component.css'
})
export class ShippingShipmentDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private driverService = inject(DriverService);
  private apiUrl = `${environment.apiUrl}/api`;

  shipmentId!: number;
  shipment: AdminShipmentDetail | null = null;
  orders: ShipmentOrderDto[] = [];

  isLoadingShipment = true;
  isLoadingOrders = true;

  // Assign
  showAssignModal = false;
  availableDrivers: DriverItem[] = [];
  isLoadingDrivers = false;
  selectedDriverId: number | null = null;
  isAssigning = false;

  // Unassign
  showUnassignModal = false;
  isUnassigning = false;

  // Toast
  successMessage = '';
  errorMessage = '';

  get isLoading(): boolean {
    return this.isLoadingShipment || this.isLoadingOrders;
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && !isNaN(+idParam)) {
      this.shipmentId = +idParam;
      this.loadShipment();
      this.loadOrders();
    } else {
      this.isLoadingShipment = false;
      this.isLoadingOrders = false;
      this.errorMessage = 'Invalid shipment ID.';
    }
  }

  // ─── Load Shipment ────────────────────────────────────────────

  loadShipment(): void {
    this.isLoadingShipment = true;
    this.http.get<AdminShipmentDetail>(`${this.apiUrl}/Shipments/${this.shipmentId}`)
      .pipe(finalize(() => this.isLoadingShipment = false))
      .subscribe({
        next: (data) => {
          this.shipment = data ?? null;
        },
        error: (err) => {
          console.error('Failed to load shipment', err);
          this.showError('Failed to load shipment details.');
        }
      });
  }

  // ─── Load Orders ──────────────────────────────────────────────

  loadOrders(): void {
    this.isLoadingOrders = true;
    this.http.get<any>(`${this.apiUrl}/Shipments/${this.shipmentId}/Orders`)
      .pipe(finalize(() => this.isLoadingOrders = false))
      .subscribe({
        next: (data: any) => {
          try {
            if (Array.isArray(data)) {
              this.orders = data;
            } else if (data && Array.isArray(data.items)) {
              this.orders = data.items;
            } else if (data && Array.isArray(data.Items)) {
              this.orders = data.Items;
            } else {
              this.orders = [];
            }
          } catch {
            this.orders = [];
          }
        },
        error: (err) => {
          console.error('Failed to load orders', err);
          this.orders = [];
        }
      });
  }

  // ─── Status helpers ───────────────────────────────────────────

  getStatusLabel(status: string | null | undefined): string {
    const map: Record<string, string> = {
      'Pending': 'Pending', 'Unassigned': 'Unassigned', 'Assigned': 'Assigned',
      'PickingUp': 'Picking Up', 'OutForDelivery': 'Out for Delivery', 'Delivered': 'Delivered'
    };
    return map[status ?? ''] ?? (status ?? '');
  }

  getStatusClass(status: string | null | undefined): string {
    const map: Record<string, string> = {
      'Delivered': 'st-delivered', 'OutForDelivery': 'st-transit',
      'PickingUp': 'st-picking', 'Assigned': 'st-assigned',
      'Unassigned': 'st-unassigned', 'Pending': 'st-pending'
    };
    return map[status ?? ''] ?? 'st-pending';
  }

  getOrderStatusClass(status: string | null | undefined): string {
    const map: Record<string, string> = {
      'Pending': 'os-pending', 'Paid': 'os-paid', 'Ready': 'os-ready',
      'PickedUp': 'os-pickedup', 'Delivered': 'os-delivered', 'Cancelled': 'os-cancelled'
    };
    return map[status ?? ''] ?? 'os-pending';
  }

  getTimelineSteps() {
    return [
      { label: 'Order Placed',      icon: '📋', date: this.shipment?.orderTime ?? null },
      { label: 'Ready for Pickup',  icon: '📦', date: this.shipment?.readyForPickupAt ?? null },
      { label: 'Driver Assigned',   icon: '👤', date: this.shipment?.driverName ? this.shipment.orderTime : null, customText: this.shipment?.driverName ?? null },
      { label: 'Trip Started',      icon: '🚀', date: this.shipment?.tripStartedAt ?? null },
      { label: 'Out for Delivery',  icon: '🚚', date: this.shipment?.outForDeliveryAt ?? null },
      { label: 'Delivered',         icon: '✅', date: this.shipment?.deliveredAt ?? null },
    ];
  }

  canAssign(): boolean {
    const s = this.shipment?.shipmentStatus ?? '';
    return s === 'Unassigned' || s === 'Pending';
  }

  canUnassign(): boolean {
    return this.shipment?.shipmentStatus === 'Assigned';
  }

  getTotalItems(): number {
    try {
      if (!Array.isArray(this.orders)) return 0;
      return this.orders.reduce((sum, o) => sum + (o?.numberOfItems ?? 0), 0);
    } catch {
      return 0;
    }
  }

  // ─── Assign Driver ─────────────────────────────────────────────

  openAssignModal(): void {
    this.selectedDriverId = null;
    this.showAssignModal = true;
    this.loadAvailableDrivers();
  }

  closeAssignModal(): void {
    this.showAssignModal = false;
    this.selectedDriverId = null;
  }

  loadAvailableDrivers(): void {
    this.isLoadingDrivers = true;
    this.driverService.getAllDrivers({ PageSize: 100 })
      .pipe(finalize(() => this.isLoadingDrivers = false))
      .subscribe({
        next: (data: any) => {
          try {
            const all: DriverItem[] = data?.items ?? data ?? [];
            if (Array.isArray(all)) {
              this.availableDrivers = all.filter((d: any) => {
                const s = typeof d?.status === 'string' ? d.status : '';
                const n = typeof d?.status === 'number' ? d.status : -1;
                return s === 'Available' || s === '1' || n === 1;
              });
            } else {
              this.availableDrivers = [];
            }
          } catch {
            this.availableDrivers = [];
          }
        },
        error: () => { 
          this.availableDrivers = [];
        }
      });
  }

  confirmAssign(): void {
    if (!this.selectedDriverId) return;
    this.isAssigning = true;

    this.http.put<void>(
      `${this.apiUrl}/Shipments/${this.shipmentId}/assign`,
      { driverId: this.selectedDriverId }
    ).pipe(finalize(() => this.isAssigning = false))
     .subscribe({
      next: () => {
        this.closeAssignModal();
        this.showSuccess('Driver assigned successfully!');
        this.loadShipment();
      },
      error: (err) => {
        const msg = err?.error?.message || err?.error?.error?.message || 'Failed to assign driver.';
        this.showError(msg);
      }
    });
  }

  // ─── Unassign Driver ───────────────────────────────────────────

  openUnassignModal(): void { this.showUnassignModal = true; }
  closeUnassignModal(): void { this.showUnassignModal = false; }

  confirmUnassign(): void {
    this.isUnassigning = true;
    this.http.put<void>(`${this.apiUrl}/Shipments/${this.shipmentId}/unassign`, {})
      .pipe(finalize(() => this.isUnassigning = false))
      .subscribe({
        next: () => {
          this.closeUnassignModal();
          this.showSuccess('Driver unassigned successfully!');
          this.loadShipment();
        },
        error: (err) => {
          const msg = err?.error?.message || 'Failed to unassign driver.';
          this.showError(msg);
        }
      });
  }

  // ─── Toasts ────────────────────────────────────────────────────

  showSuccess(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 4000);
  }

  showError(msg: string): void {
    this.errorMessage = msg;
    setTimeout(() => this.errorMessage = '', 6000);
  }

  getDriverLabel(d: DriverItem): string {
    return d?.driverName || d?.name || `Driver #${d?.id}`;
  }

  trackByOrderId(_: number, o: ShipmentOrderDto): number { return o?.orderId ?? 0; }
}
