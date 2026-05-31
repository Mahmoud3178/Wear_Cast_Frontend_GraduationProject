import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
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
  vehicleType?: any;
  vehiclePlateNumber?: string;
  driverCity?: string | null;
  numberOfAssignedShipments?: number;
  numberOfActiveShipments?: number;
  numberOfDeliveredShipments?: number;
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
  private cdr = inject(ChangeDetectorRef);
  private apiUrl = `${environment.apiUrl}/api`;

  shipmentId!: number;
  shipment: AdminShipmentDetail | null = null;
  orders: ShipmentOrderDto[] = [];   // ← مش null، array فاضي من الأول

  isLoading = true;
  isLoadingShipment = false;         // ← إضافة المتغير الناقص
  isLoadingOrders = false;           // ← إضافة المتغير الناقص

  timelineSteps: any[] = [];
  nextAction: any = null;
  totalItems = 0;

  // Assign
  showAssignModal = false;
  availableDrivers: DriverItem[] = [];
  isLoadingDrivers = false;
  selectedDriverId: number | null = null;
  isAssigning = false;

  // Unassign
  showUnassignModal = false;
  isUnassigning = false;

  // Delivery code modal
  showCodeModal = false;
  enteredCode = '';

  // Toast
  successMessage = '';
  errorMessage = '';

  ngOnInit(): void {
    console.log('[MANAGER ngOnInit] Component initialized.');
    const idParam = this.route.snapshot.paramMap.get('id');
    console.log('[MANAGER ngOnInit] Parsed ID from route:', idParam);
    if (idParam && !isNaN(+idParam)) {
      this.shipmentId = +idParam;
      console.log('[MANAGER ngOnInit] Calling loadShipment and loadOrders for shipment ID:', this.shipmentId);
      this.loadShipment();
      this.loadOrders();
    } else {
      console.warn('[MANAGER ngOnInit] Invalid ID parameter. Stopping load.');
      this.isLoading = false;
      this.errorMessage = 'Invalid shipment ID.';
    }
  }

  // ─── Load Shipment ────────────────────────────────────────────

  loadShipment(): void {
    console.log('[MANAGER loadShipment] Started fetching shipment details...');
    this.http.get<AdminShipmentDetail>(`${this.apiUrl}/Shipments/${this.shipmentId}`)
      .subscribe({
        next: (data) => {
          console.log('[MANAGER loadShipment] SUCCESS. Data received:', data);
          this.shipment = data ?? null;
          this.updateTimelineAndAction();
          this.checkLoadingState('loadShipment');
        },
        error: (err) => {
          console.error('[MANAGER loadShipment] ERROR:', err);
          this.showError('Failed to load shipment details.');
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  // ─── Load Orders ──────────────────────────────────────────────

  loadOrders(): void {
    console.log('[MANAGER loadOrders] Started fetching orders...');
    this.isLoadingOrders = true;
    this.http.get<any>(`${this.apiUrl}/Shipments/${this.shipmentId}/Orders`)
      .pipe(finalize(() => { 
        console.log('[MANAGER loadOrders] Finalize block executed.');
        this.isLoadingOrders = false; 
        this.checkLoadingState('loadOrders finalize');
      }))
      .subscribe({
        next: (data: any) => {
          console.log('[MANAGER loadOrders] SUCCESS. Raw Data:', data);
          try {
            if (Array.isArray(data)) {
              this.orders = data;
            } else if (data && Array.isArray(data.items)) {
              this.orders = data.items;
            } else if (data && Array.isArray(data.Items)) {
              this.orders = data.Items;
            } else {
              console.warn('[MANAGER loadOrders] Data format unknown, setting to empty array.');
              this.orders = [];
            }
          } catch {
            console.error('[MANAGER loadOrders] Parsing error.');
            this.orders = [];
          }
          console.log('[MANAGER loadOrders] Processed orders array length:', this.orders?.length);
          this.updateTimelineAndAction();
        },
        error: (err) => {
          console.error('[MANAGER loadOrders] ERROR:', err);
          this.orders = [];
          this.updateTimelineAndAction();
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  checkLoadingState(caller: string): void {
    console.log(`[MANAGER checkLoadingState] Called by: ${caller}`);
    console.log(`[MANAGER checkLoadingState] Current State -> shipment loaded: ${this.shipment !== null}, isLoadingOrders: ${this.isLoadingOrders}`);
    
    // orders دلوقتي array دايمًا، بس بنستنى الـ shipment يجي
    if (this.shipment !== null && !this.isLoadingOrders) {
      console.log('[MANAGER checkLoadingState] Both conditions met! Turning off spinner (isLoading = false)');
      this.isLoading = false;
      this.cdr.detectChanges();
    } else {
      console.log('[MANAGER checkLoadingState] Still waiting for data. Spinner remains true.');
    }
  }

  updateTimelineAndAction(): void {
    this.timelineSteps = this.getTimelineSteps();
    this.nextAction = this.getNextAction();
    this.totalItems = this.getTotalItems();
  }

  // ─── Status helpers ───────────────────────────────────────────

  getStatusLabel(status: string | null | undefined): string {
    const s = status?.toString() ?? '';
    const map: Record<string, string> = {
      'Pending': 'Pending', '1': 'Pending',
      'Unassigned': 'Unassigned', '2': 'Unassigned',
      'Assigned': 'Assigned', '3': 'Assigned',
      'PickingUp': 'Picking Up', '4': 'Picking Up',
      'OutForDelivery': 'Out for Delivery', '5': 'Out for Delivery',
      'Delivered': 'Delivered', '6': 'Delivered'
    };
    return map[s] ?? s;
  }

  getStatusClass(status: string | null | undefined): string {
    const s = status?.toString() ?? '';
    const map: Record<string, string> = {
      'Delivered': 'st-delivered', '6': 'st-delivered',
      'OutForDelivery': 'st-transit', '5': 'st-transit',
      'PickingUp': 'st-picking', '4': 'st-picking',
      'Assigned': 'st-assigned', '3': 'st-assigned',
      'Unassigned': 'st-unassigned', '2': 'st-unassigned',
      'Pending': 'st-pending', '1': 'st-pending'
    };
    return map[s] ?? 'st-pending';
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
      { label: 'Order Placed',      icon: '📋', date: this.shipment?.orderTime ?? null,         customText: null },
      { label: 'Ready for Pickup',  icon: '📦', date: this.shipment?.readyForPickupAt ?? null,   customText: null },
      { label: 'Driver Assigned',   icon: '👤', date: this.shipment?.driverName ? this.shipment.orderTime : null, customText: this.shipment?.driverName ?? null },
      { label: 'Trip Started',      icon: '🚀', date: this.shipment?.tripStartedAt ?? null,      customText: null },
      { label: 'Out for Delivery',  icon: '🚚', date: this.shipment?.outForDeliveryAt ?? null,   customText: null },
      { label: 'Delivered',         icon: '✅', date: this.shipment?.deliveredAt ?? null,        customText: null },
    ];
  }

  canAssign(): boolean {
    const s = this.shipment?.shipmentStatus?.toString() ?? '';
    return s === 'Unassigned' || s === '2';
  }

  canUnassign(): boolean {
    const s = this.shipment?.shipmentStatus?.toString() ?? '';
    return s === 'Assigned' || s === '3' || s === 'PickingUp' || s === '4';
  }

  getTotalItems(): number {
    try {
      return this.orders.reduce((sum, o) => sum + (o?.numberOfItems ?? 0), 0);
    } catch {
      return 0;
    }
  }

  // ─── Actions ──────────────────────────────────────────────────

  updateOrderToPickedUp(order: ShipmentOrderDto): void {
    this.isLoadingOrders = true;
    this.driverService.updateOrderStatus(order.orderId, 6).subscribe({
      next: () => {
        this.showSuccess(`Order #${order.orderId} marked as Picked Up!`);
        this.loadOrders();
      },
      error: (err) => {
        this.isLoadingOrders = false;
        this.showError(`Failed to update Order #${order.orderId}.`);
      }
    });
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
      .pipe(finalize(() => { this.isLoadingShipment = false; }))
      .subscribe({
        next: () => {
          this.showSuccess('Shipment status updated successfully!');
          this.loadShipment();
          this.loadOrders();
        },
        error: (err) => {
          const apiError = err?.error?.error || err?.error;
          let msg = 'Failed to update shipment status.';
          if (apiError?.code) {
            const codeMessages: Record<string, string> = {
              'Shipment.NotReady':          '⚠️ Cannot start trip: Some orders are not yet marked as Ready.',
              'Shipment.NotPickedUp':       '⚠️ Cannot go out for delivery: All orders must be picked up first.',
              'Shipment.WrongDeliveryCode': '❌ Incorrect delivery code. Please check with the customer.',
              'Shipment.InvalidTransition': '⚠️ This status change is not allowed at this stage.'
            };
            msg = codeMessages[apiError.code] ?? msg;
          } else if (apiError?.message) {
            msg = apiError.message;
          } else if (typeof err?.error === 'string') {
            msg = err.error;
          }
          this.showError(msg);
        }
      });
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
      .pipe(finalize(() => { this.isLoadingDrivers = false; }))
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
    ).pipe(finalize(() => { this.isAssigning = false; }))
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

  openUnassignModal(): void  { this.showUnassignModal = true; }
  closeUnassignModal(): void { this.showUnassignModal = false; }

  confirmUnassign(): void {
    this.isUnassigning = true;
    this.http.put<void>(`${this.apiUrl}/Shipments/${this.shipmentId}/unassign`, {})
      .pipe(finalize(() => { this.isUnassigning = false; }))
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
    setTimeout(() => { this.successMessage = ''; }, 4000);
  }

  showError(msg: string): void {
    this.errorMessage = msg;
    setTimeout(() => { this.errorMessage = ''; }, 6000);
  }

  getDriverLabel(d: DriverItem): string {
    return d?.driverName || d?.name || `Driver #${d?.id}`;
  }

  getVehicleTypeLabel(type: any): string {
    const map: Record<number, string> = {
      1: 'Bicycle',
      2: 'Motorcycle',
      3: 'Car',
      4: 'Van'
    };
    return map[typeof type === 'number' ? type : Number(type)] ?? 'Vehicle';
  }

  trackByOrderId(_: number, o: ShipmentOrderDto): number { return o?.orderId ?? 0; }
}
