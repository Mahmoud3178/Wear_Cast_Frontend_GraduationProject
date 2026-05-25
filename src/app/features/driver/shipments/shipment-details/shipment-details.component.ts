import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

// ─── Interfaces matching the ACTUAL backend responses ───────────────────────

export interface AddressDto {
  state?: string | null;
  city?: string | null;
  street?: string | null;
  buildingNumber?: string | null;
}

/** GET /api/drivers/shipments/{id} */
export interface DriverShipmentDetailDto {
  id: number;
  deliveryAddress?: AddressDto | null;
  shipmentStatus: string;
  orderedAt?: string | null;
  readyForPickupAt?: string | null;
  tripStartedAt?: string | null;
  outForDeliveryAt?: string | null;
  deliveredAt?: string | null;
  customerName?: string | null;
  customerPhoneNumber?: string | null;
}

/** GET /api/Shipments/{id}/Orders  (array item) */
export interface ShipmentOrderDto {
  orderId: number;
  orderType?: string | null;
  vendorName?: string | null;
  vendorAddress?: AddressDto | null;
  vendorPhoneNumber?: string | null;
  orderStatus?: string | null;
  numberOfItems?: number | null;
}

@Component({
  selector: 'app-shipment-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './shipment-details.component.html',
  styleUrl: './shipment-details.component.css'
})
export class ShipmentDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api`;

  shipmentId!: number;
  shipment: DriverShipmentDetailDto | null = null;
  orders: ShipmentOrderDto[] = [];

  isLoadingShipment = true;
  isLoadingOrders = true;
  errorMessage = '';
  successMessage = '';

  // Delivery code modal
  showCodeModal = false;
  enteredCode = '';

  // Unassign confirmation modal
  showUnassignModal = false;
  isUnassigning = false;

  get isLoading(): boolean {
    return this.isLoadingShipment || this.isLoadingOrders;
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && !isNaN(+idParam)) {
      this.shipmentId = +idParam;
      this.loadShipmentDetails();
      this.loadOrders();
    } else {
      // No valid ID — stop loading immediately
      this.isLoadingShipment = false;
      this.isLoadingOrders = false;
      this.errorMessage = 'Invalid shipment ID.';
    }
  }

  // ─── Load shipment ───────────────────────────────────────────────────────

  loadShipmentDetails(): void {
    this.isLoadingShipment = true;
    this.http.get<DriverShipmentDetailDto>(`${this.apiUrl}/drivers/shipments/${this.shipmentId}`)
      .subscribe({
        next: (data) => {
          this.shipment = data ?? null;
          this.isLoadingShipment = false;
        },
        error: (err) => {
          console.error('Failed to load shipment details', err);
          this.errorMessage = 'Failed to load shipment details. Please go back and try again.';
          this.isLoadingShipment = false;
        }
      });
  }

  // ─── Load orders ─────────────────────────────────────────────────────────

  loadOrders(): void {
    this.isLoadingOrders = true;
    this.http.get<any>(`${this.apiUrl}/Shipments/${this.shipmentId}/Orders`)
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
          this.isLoadingOrders = false;
        },
        error: (err) => {
          console.error('Failed to load orders', err);
          this.orders = [];
          this.isLoadingOrders = false;
        }
      });
  }

  // ─── Status helpers ──────────────────────────────────────────────────────

  getStatusLabel(status: string | null | undefined): string {
    const map: Record<string, string> = {
      'Pending': 'Pending',
      'Unassigned': 'Unassigned',
      'Assigned': 'Assigned',
      'PickingUp': 'Picking Up',
      'OutForDelivery': 'Out For Delivery',
      'Delivered': 'Delivered'
    };
    return map[status ?? ''] ?? (status ?? '');
  }

  getStatusClass(status: string | null | undefined): string {
    const map: Record<string, string> = {
      'Delivered': 'status-delivered',
      'OutForDelivery': 'status-out',
      'PickingUp': 'status-picking',
      'Assigned': 'status-assigned',
      'Unassigned': 'status-unassigned',
      'Pending': 'status-pending'
    };
    return map[status ?? ''] ?? 'status-pending';
  }

  getStatusIcon(status: string | null | undefined): string {
    const map: Record<string, string> = {
      'Delivered': '✓',
      'OutForDelivery': '🚚',
      'PickingUp': '📦',
      'Assigned': '👤',
      'Unassigned': '⏳',
      'Pending': '⏳'
    };
    return map[status ?? ''] ?? '•';
  }

  getOrderStatusClass(status: string | null | undefined): string {
    const map: Record<string, string> = {
      'Pending': 'order-status-pending',
      'Paid': 'order-status-paid',
      'Ready': 'order-status-ready',
      'PickedUp': 'order-status-pickedup',
      'Delivered': 'order-status-delivered',
      'Cancelled': 'order-status-cancelled'
    };
    return map[status ?? ''] ?? 'order-status-pending';
  }

  isAssigned(): boolean {
    return this.shipment?.shipmentStatus === 'Assigned';
  }

  isDelivered(): boolean {
    return this.shipment?.shipmentStatus === 'Delivered';
  }

  getTimelineSteps() {
    return [
      { label: 'Order Placed',      date: this.shipment?.orderedAt ?? null,          icon: '📋' },
      { label: 'Ready for Pickup',  date: this.shipment?.readyForPickupAt ?? null,   icon: '📦' },
      { label: 'Trip Started',      date: this.shipment?.tripStartedAt ?? null,      icon: '🚀' },
      { label: 'Out for Delivery',  date: this.shipment?.outForDeliveryAt ?? null,   icon: '🚚' },
      { label: 'Delivered',         date: this.shipment?.deliveredAt ?? null,        icon: '✅' },
    ];
  }

  // ─── Next action ─────────────────────────────────────────────────────────

  getNextAction(): { label: string; class: string; status: string } | null {
    const s = this.shipment?.shipmentStatus;
    if (s === 'PickingUp') {
      return { label: '🚚 Start Delivery Trip', class: 'btn-action-primary', status: 'OutForDelivery' };
    }
    if (s === 'OutForDelivery') {
      return { label: '✅ Complete Delivery', class: 'btn-action-success', status: 'Delivered' };
    }
    return null;
  }

  // ─── Status update ───────────────────────────────────────────────────────

  onActionClick(): void {
    const next = this.getNextAction();
    if (!next) return;
    if (next.status === 'Delivered') {
      this.enteredCode = '';
      this.showCodeModal = true;
    } else {
      this.executeStatusUpdate(next.status);
    }
  }

  cancelModal(): void {
    this.showCodeModal = false;
    this.enteredCode = '';
  }

  confirmDelivery(): void {
    if (!this.enteredCode.trim()) {
      this.showError('Please enter the delivery code provided by the customer.');
      return;
    }
    this.showCodeModal = false;
    this.executeStatusUpdate('Delivered', this.enteredCode.trim());
  }

  executeStatusUpdate(status: string, deliveryCode?: string): void {
    if (!this.shipment) return;
    this.isLoadingShipment = true;
    this.errorMessage = '';

    const statusMap: Record<string, number> = {
      'Pending': 1, 'Unassigned': 2, 'Assigned': 3,
      'PickingUp': 4, 'OutForDelivery': 5, 'Delivered': 6
    };

    const body: any = { newStatus: statusMap[status] };
    if (deliveryCode) body.deliveryCode = deliveryCode;

    this.http.put<void>(`${this.apiUrl}/Shipments/${this.shipmentId}/status`, body)
      .pipe(finalize(() => this.isLoadingShipment = false))
      .subscribe({
        next: () => {
          this.showSuccess('Shipment status updated successfully!');
          this.loadShipmentDetails();
          this.loadOrders();
        },
        error: (err) => {
          this.handleApiError(err, 'Failed to update shipment status.');
        }
      });
  }

  // ─── Unassign ────────────────────────────────────────────────────────────

  openUnassignModal(): void { this.showUnassignModal = true; }
  cancelUnassign(): void    { this.showUnassignModal = false; }

  confirmUnassign(): void {
    this.isUnassigning = true;
    this.errorMessage = '';

    this.http.put<void>(`${this.apiUrl}/Shipments/${this.shipmentId}/unassign`, {})
      .pipe(finalize(() => this.isUnassigning = false))
      .subscribe({
        next: () => {
          this.showUnassignModal = false;
          this.showSuccess('Shipment unassigned. Redirecting…');
          setTimeout(() => this.router.navigate(['/driver/shipments']), 1500);
        },
        error: (err) => {
          this.showUnassignModal = false;
          this.handleApiError(err, 'Failed to unassign shipment.');
        }
      });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  showSuccess(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 4000);
  }

  showError(msg: string): void {
    this.errorMessage = msg;
    setTimeout(() => this.errorMessage = '', 6000);
  }

  handleApiError(err: any, fallback: string): void {
    try {
      const apiError = err?.error?.error || err?.error;
      if (apiError?.code) {
        const codeMessages: Record<string, string> = {
          'Shipment.NotReady':           '⚠️ Cannot start trip: Some orders are not yet marked as Ready by the vendor.',
          'Shipment.NotPickedUp':        '⚠️ Cannot go out for delivery: All orders must be picked up first.',
          'Shipment.WrongDeliveryCode':  '❌ Incorrect delivery code. Please ask the customer for the correct code.',
          'Shipment.InvalidTransition':  '⚠️ This status change is not allowed at this stage.'
        };
        this.errorMessage = codeMessages[apiError.code] ?? `${fallback} (${apiError.message})`;
      } else if (apiError?.message) {
        this.errorMessage = `${fallback} ${apiError.message}`;
      } else if (typeof err?.error === 'string') {
        this.errorMessage = `${fallback} ${err.error}`;
      } else {
        this.errorMessage = fallback;
      }
    } catch {
      this.errorMessage = fallback;
    }
  }

  getTotalItems(): number {
    try {
      if (!Array.isArray(this.orders)) return 0;
      return this.orders.reduce((sum, o) => sum + (o?.numberOfItems ?? 0), 0);
    } catch {
      return 0;
    }
  }

  trackByOrderId(_: number, o: ShipmentOrderDto): number { return o?.orderId ?? 0; }
}
