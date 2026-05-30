import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { DriverService } from '../../../../core/services/driver.service';

export interface AddressDto {
  state?: string | null;
  city?: string | null;
  street?: string | null;
  buildingNumber?: string | null;
}

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
  private driverService = inject(DriverService);
  private cdr = inject(ChangeDetectorRef);
  private apiUrl = `${environment.apiUrl}/api`;

  shipmentId!: number;
  shipment: DriverShipmentDetailDto | null = null;
  orders: ShipmentOrderDto[] = [];

  isLoading = true;
  isLoadingShipment = false;
  isLoadingOrders = false;
  errorMessage = '';
  successMessage = '';

  showCodeModal = false;
  enteredCode = '';

  showUnassignModal = false;
  isUnassigning = false;

  

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && !isNaN(+idParam)) {
      this.shipmentId = +idParam;
      this.loadShipmentDetails();
      this.loadOrders();
    } else {
      this.isLoading = false;
      this.errorMessage = 'Invalid shipment ID.';
    }
  }

  loadShipmentDetails(): void {
    this.http.get<DriverShipmentDetailDto>(`${this.apiUrl}/drivers/shipments/${this.shipmentId}`)
      .subscribe({
        next: (data) => {
          this.shipment = data ?? null;
          this.checkLoadingState();
        },
        error: (err) => {
          this.errorMessage = 'Failed to load shipment details. Please go back and try again.';
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  loadOrders(): void {
    this.http.get<any>(`${this.apiUrl}/Shipments/${this.shipmentId}/Orders`)
      .subscribe({
        next: (data: any) => {
          if (Array.isArray(data)) {
            this.orders = data;
          } else if (data && Array.isArray(data.items)) {
            this.orders = data.items;
          } else if (data && Array.isArray(data.Items)) {
            this.orders = data.Items;
          } else {
            this.orders = [];
          }
          this.checkLoadingState();
        },
        error: () => {
          this.orders = [];
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  checkLoadingState(): void {
    if (this.shipment !== null) {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  getStatusLabel(status: string | null | undefined): string {
    const s = status?.toString() ?? '';
    const map: Record<string, string> = {
      'Pending': 'Pending', '1': 'Pending',
      'Unassigned': 'Unassigned', '2': 'Unassigned',
      'Assigned': 'Assigned', '3': 'Assigned',
      'PickingUp': 'Picking Up', '4': 'Picking Up',
      'OutForDelivery': 'Out For Delivery', '5': 'Out For Delivery',
      'Delivered': 'Delivered', '6': 'Delivered'
    };
    return map[s] ?? s;
  }

  getStatusClass(status: string | null | undefined): string {
    const s = status?.toString() ?? '';
    const map: Record<string, string> = {
      'Delivered': 'status-delivered', '6': 'status-delivered',
      'OutForDelivery': 'status-out', '5': 'status-out',
      'PickingUp': 'status-picking', '4': 'status-picking',
      'Assigned': 'status-assigned', '3': 'status-assigned',
      'Unassigned': 'status-unassigned', '2': 'status-unassigned',
      'Pending': 'status-pending', '1': 'status-pending'
    };
    return map[s] ?? 'status-pending';
  }

  getStatusIcon(status: string | null | undefined): string {
    const s = status?.toString() ?? '';
    const map: Record<string, string> = {
      'Delivered': '✓', '6': '✓',
      'OutForDelivery': '🚚', '5': '🚚',
      'PickingUp': '📦', '4': '📦',
      'Assigned': '👤', '3': '👤',
      'Unassigned': '⏳', '2': '⏳',
      'Pending': '⏳', '1': '⏳'
    };
    return map[s] ?? '•';
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
    const s = this.shipment?.shipmentStatus?.toString() ?? '';
    return s === 'Assigned' || s === '3';
  }

  isDelivered(): boolean {
    const s = this.shipment?.shipmentStatus?.toString() ?? '';
    return s === 'Delivered' || s === '6';
  }

  getTimelineSteps() {
    return [
      { label: 'Order Placed',      date: this.shipment?.orderedAt ?? null,        icon: '📋' },
      { label: 'Ready for Pickup',  date: this.shipment?.readyForPickupAt ?? null, icon: '📦' },
      { label: 'Trip Started',      date: this.shipment?.tripStartedAt ?? null,    icon: '🚀' },
      { label: 'Out for Delivery',  date: this.shipment?.outForDeliveryAt ?? null, icon: '🚚' },
      { label: 'Delivered',         date: this.shipment?.deliveredAt ?? null,      icon: '✅' },
    ];
  }

  getNextAction(): { label: string; class: string; status: string } | null {
    const s = this.shipment?.shipmentStatus?.toString() ?? '';
    if (s === 'PickingUp' || s === '4') {
      return { label: '🚚 Start Delivery Trip', class: 'btn-action-primary', status: 'OutForDelivery' };
    }
    if (s === 'OutForDelivery' || s === '5') {
      return { label: '✅ Complete Delivery', class: 'btn-action-success', status: 'Delivered' };
    }
    return null;
  }

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

  updateOrderToPickedUp(order: ShipmentOrderDto): void {
    this.isLoadingOrders = true;
    this.driverService.updateOrderStatus(order.orderId, 6).subscribe({
      next: () => {
        this.showSuccess(`Order #${order.orderId} marked as Picked Up!`);
        this.loadOrders();
      },
      error: (err) => {
        this.isLoadingOrders = false;
        this.handleApiError(err, `Failed to update Order #${order.orderId}.`);
      }
    });
  }

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
          'Shipment.NotReady':          '⚠️ Cannot start trip: Some orders are not yet marked as Ready by the vendor.',
          'Shipment.NotPickedUp':       '⚠️ Cannot go out for delivery: All orders must be picked up first.',
          'Shipment.WrongDeliveryCode': '❌ Incorrect delivery code. Please ask the customer for the correct code.',
          'Shipment.InvalidTransition': '⚠️ This status change is not allowed at this stage.'
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
      return this.orders.reduce((sum, o) => sum + (o?.numberOfItems ?? 0), 0);
    } catch {
      return 0;
    }
  }

  trackByOrderId(_: number, o: ShipmentOrderDto): number { return o?.orderId ?? 0; }
}
