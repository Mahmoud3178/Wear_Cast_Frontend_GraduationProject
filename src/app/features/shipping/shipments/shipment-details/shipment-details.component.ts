import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { DriverService } from '../../../../core/services/driver.service';

// ─── Interfaces matching actual backend DTOs ────────────────────────────────

export interface AddressDto {
  state: string;
  city: string;
  street: string;
  buildingNumber?: string;
}

/** GET /api/Shipments/{id} */
export interface AdminShipmentDetail {
  id: number;
  deliveryAddress: AddressDto;
  price: number;
  shipmentStatus: string;
  orderTime: string;
  readyForPickupAt: string | null;
  tripStartedAt: string | null;
  outForDeliveryAt: string | null;
  deliveredAt: string | null;
  deliveryCode: string;
  driverId: number | null;
  driverName: string | null;
  driverPhoneNumber: string | null;
  driverNationalId: string | null;
  customerId: number;
  customerName: string;
  customerPhoneNumber: string;
}

/** GET /api/Shipments/{id}/Orders (array item) */
export interface ShipmentOrderDto {
  orderId: number;
  orderType: string;
  vendorName: string;
  vendorAddress: AddressDto;
  vendorPhoneNumber: string;
  orderStatus: string;
  numberOfItems: number;
}

export interface DriverItem {
  id: number;
  driverName?: string;
  name?: string;
  status: any;
  driverCity?: string;
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
    if (idParam) {
      this.shipmentId = +idParam;
      this.loadShipment();
      this.loadOrders();
    }
  }

  // ─── Load Shipment ────────────────────────────────────────────

  loadShipment(): void {
    this.isLoadingShipment = true;
    this.http.get<AdminShipmentDetail>(`${this.apiUrl}/Shipments/${this.shipmentId}`)
      .subscribe({
        next: (data) => {
          this.shipment = data;
          this.isLoadingShipment = false;
        },
        error: (err) => {
          console.error('Failed to load shipment', err);
          this.isLoadingShipment = false;
          this.showError('Failed to load shipment details.');
        }
      });
  }

  // ─── Load Orders ──────────────────────────────────────────────

  loadOrders(): void {
    this.isLoadingOrders = true;
    this.http.get<ShipmentOrderDto[]>(`${this.apiUrl}/Shipments/${this.shipmentId}/Orders`)
      .subscribe({
        next: (data) => {
          this.orders = data ?? [];
          this.isLoadingOrders = false;
        },
        error: () => {
          this.orders = [];
          this.isLoadingOrders = false;
        }
      });
  }

  // ─── Status helpers ───────────────────────────────────────────

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      'Pending': 'Pending', 'Unassigned': 'Unassigned', 'Assigned': 'Assigned',
      'PickingUp': 'Picking Up', 'OutForDelivery': 'Out for Delivery', 'Delivered': 'Delivered'
    };
    return map[status] ?? status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'Delivered': 'st-delivered', 'OutForDelivery': 'st-transit',
      'PickingUp': 'st-picking', 'Assigned': 'st-assigned',
      'Unassigned': 'st-unassigned', 'Pending': 'st-pending'
    };
    return map[status] ?? 'st-pending';
  }

  getOrderStatusClass(status: string): string {
    const map: Record<string, string> = {
      'Pending': 'os-pending', 'Paid': 'os-paid', 'Ready': 'os-ready',
      'PickedUp': 'os-pickedup', 'Delivered': 'os-delivered', 'Cancelled': 'os-cancelled'
    };
    return map[status] ?? 'os-pending';
  }

  getTimelineSteps() {
    return [
      { label: 'Order Placed',      icon: '📋', date: this.shipment?.orderTime },
      { label: 'Ready for Pickup',  icon: '📦', date: this.shipment?.readyForPickupAt },
      { label: 'Driver Assigned',   icon: '👤', date: this.shipment?.driverName ? this.shipment.orderTime : null, customText: this.shipment?.driverName ?? null },
      { label: 'Trip Started',      icon: '🚀', date: this.shipment?.tripStartedAt },
      { label: 'Out for Delivery',  icon: '🚚', date: this.shipment?.outForDeliveryAt },
      { label: 'Delivered',         icon: '✅', date: this.shipment?.deliveredAt },
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
    return this.orders.reduce((sum, o) => sum + (o.numberOfItems ?? 0), 0);
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
    this.driverService.getAllDrivers({ PageSize: 100 }).subscribe({
      next: (data: any) => {
        const all: DriverItem[] = data.items ?? data ?? [];
        this.availableDrivers = all.filter((d: any) => {
          const s = typeof d.status === 'string' ? d.status : '';
          const n = typeof d.status === 'number' ? d.status : -1;
          return s === 'Available' || s === '1' || n === 1;
        });
        this.isLoadingDrivers = false;
      },
      error: () => { this.isLoadingDrivers = false; }
    });
  }

  confirmAssign(): void {
    if (!this.selectedDriverId) return;
    this.isAssigning = true;

    this.http.put<void>(
      `${this.apiUrl}/Shipments/${this.shipmentId}/assign`,
      { driverId: this.selectedDriverId }
    ).subscribe({
      next: () => {
        this.isAssigning = false;
        this.closeAssignModal();
        this.showSuccess('Driver assigned successfully!');
        this.loadShipment();
      },
      error: (err) => {
        this.isAssigning = false;
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
      .subscribe({
        next: () => {
          this.isUnassigning = false;
          this.closeUnassignModal();
          this.showSuccess('Driver unassigned successfully!');
          this.loadShipment();
        },
        error: (err) => {
          this.isUnassigning = false;
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
    return d.driverName || d.name || `Driver #${d.id}`;
  }

  trackByOrderId(_: number, o: ShipmentOrderDto): number { return o.orderId; }
}
