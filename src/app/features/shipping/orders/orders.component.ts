import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { DriverService } from '../../../core/services/driver.service';

// ─── Interfaces matching actual backend DTOs ─────────────────────────────────

export interface AddressDto {
  state: string;
  city: string;
  street: string;
  buildingNumber?: string;
}

/** GET /api/ShippingCompany/Orders — response item */
export interface OrderListItem {
  orderId: number;
  shipmentId: number;
  orderType: string;       // "Fixed" | "Designed"
  vendorName: string;
  vendorAddress: AddressDto;
  vendorPhoneNumber: string;
  orderStatus: string;     // "Pending" | "Paid" | "Failed" | "Cancelled" | "Refunded" | "Ready" | "PickedUp"
  numberOfItems: number;
  shipmentStatus: string;  // "Pending" | "Unassigned" | "Assigned" | "PickingUp" | "OutForDelivery" | "Delivered"
  createdOn: string;
}

export interface PaginatedOrders {
  items: OrderListItem[];
  records: number;
  pages: number;
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css'
})
export class OrdersComponent implements OnInit {
  private http = inject(HttpClient);
  private driverService = inject(DriverService);
  private apiUrl = `${environment.apiUrl}/api`;

  // ── Data ─────────────────────────────────────────────────────
  orders: OrderListItem[] = [];
  isLoading = false;

  // ── Pagination ────────────────────────────────────────────────
  currentPage = 1;
  pageSize = 10;
  totalRecords = 0;
  totalPages = 0;

  // ── Filters ───────────────────────────────────────────────────
  vendorCityFilter = '';
  orderStatusFilter = '';
  orderTypeFilter = '';
  shipmentStatusFilter = '';
  sortBy = 'Newest';

  // ── Toast ─────────────────────────────────────────────────────
  successMessage = '';
  errorMessage = '';

  // ── Options ───────────────────────────────────────────────────
  sortOptions = [
    { value: 'Newest', label: 'Newest First' },
    { value: 'Oldest', label: 'Oldest First' }
  ];

  orderStatusOptions = [
    { value: '', label: 'All Statuses' },
    { value: '0', label: 'Pending' },
    { value: '1', label: 'Paid' },
    { value: '2', label: 'Failed' },
    { value: '3', label: 'Cancelled' },
    { value: '4', label: 'Refunded' },
    { value: '5', label: 'Ready' },
    { value: '6', label: 'Picked Up' }
  ];

  orderTypeOptions = [
    { value: '', label: 'All Types' },
    { value: '0', label: 'Fixed (Store)' },
    { value: '1', label: 'Designed (Custom)' }
  ];

  shipmentStatusOptions = [
    { value: '', label: 'All Shipment Statuses' },
    { value: '0', label: 'Pending' },
    { value: '1', label: 'Unassigned' },
    { value: '2', label: 'Assigned' },
    { value: '3', label: 'Picking Up' },
    { value: '4', label: 'Out for Delivery' },
    { value: '5', label: 'Delivered' }
  ];

  private debounceTimer: any;

  ngOnInit(): void {
    this.loadOrders();
  }

  // ─── Load ──────────────────────────────────────────────────────

  loadOrders(): void {
    this.isLoading = true;

    let params = new HttpParams()
      .set('PageIndex', this.currentPage)
      .set('PageSize', this.pageSize)
      .set('SortBy', this.sortBy);

    if (this.orderStatusFilter)    params = params.set('OrderStatus', this.orderStatusFilter);
    if (this.orderTypeFilter)      params = params.set('OrderType', this.orderTypeFilter);
    if (this.shipmentStatusFilter) params = params.set('ShipmentStatus', this.shipmentStatusFilter);
    if (this.vendorCityFilter.trim()) params = params.set('VendorCity', this.vendorCityFilter.trim());

    this.http.get<PaginatedOrders>(`${this.apiUrl}/ShippingCompany/Orders`, { params })
      .subscribe({
        next: (data) => {
          this.orders = data.items ?? [];
          this.totalRecords = data.records ?? 0;
          this.totalPages = data.pages ?? 0;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load orders', err);
          this.isLoading = false;
        }
      });
  }

  // ─── Pagination ────────────────────────────────────────────────

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages && p !== this.currentPage) {
      this.currentPage = p;
      this.loadOrders();
    }
  }

  get pageNumbers(): (number | string)[] {
    const total = this.totalPages;
    const cur   = this.currentPage;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages: (number | string)[] = [1];
    const start = Math.max(2, cur - 2);
    const end   = Math.min(total - 1, cur + 2);
    if (start > 2) pages.push('…');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push('…');
    pages.push(total);
    return pages;
  }

  // ─── Filters ──────────────────────────────────────────────────

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadOrders();
  }

  onCityInput(): void {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.onFilterChange(), 400);
  }

  clearFilters(): void {
    this.vendorCityFilter = '';
    this.orderStatusFilter = '';
    this.orderTypeFilter = '';
    this.shipmentStatusFilter = '';
    this.sortBy = 'Newest';
    this.currentPage = 1;
    this.loadOrders();
  }

  // ─── Status helpers ────────────────────────────────────────────

  getOrderStatusLabel(status: string): string {
    const map: Record<string, string> = {
      'Pending': 'Pending', 'Paid': 'Paid', 'Failed': 'Failed',
      'Cancelled': 'Cancelled', 'Refunded': 'Refunded',
      'Ready': 'Ready', 'PickedUp': 'Picked Up'
    };
    return map[status] ?? status;
  }

  getOrderStatusClass(status: string): string {
    const map: Record<string, string> = {
      'Pending': 'os-pending', 'Paid': 'os-paid', 'Ready': 'os-ready',
      'PickedUp': 'os-pickedup', 'Failed': 'os-failed',
      'Cancelled': 'os-cancelled', 'Refunded': 'os-refunded'
    };
    return map[status] ?? 'os-pending';
  }

  getShipmentStatusLabel(status: string): string {
    const map: Record<string, string> = {
      'Pending': 'Pending', 'Unassigned': 'Unassigned', 'Assigned': 'Assigned',
      'PickingUp': 'Picking Up', 'OutForDelivery': 'Out for Delivery', 'Delivered': 'Delivered'
    };
    return map[status] ?? status;
  }

  getShipmentStatusClass(status: string): string {
    const map: Record<string, string> = {
      'Delivered': 'ss-delivered', 'OutForDelivery': 'ss-transit',
      'PickingUp': 'ss-picking', 'Assigned': 'ss-assigned',
      'Unassigned': 'ss-unassigned', 'Pending': 'ss-pending'
    };
    return map[status] ?? 'ss-pending';
  }

  getOrderTypeLabel(type: string): string {
    if (type === 'Fixed' || type === '0') return 'Fixed';
    if (type === 'Designed' || type === '1') return 'Designed';
    return type;
  }

  getOrderTypeClass(type: string): string {
    return (type === 'Fixed' || type === '0') ? 'type-fixed' : 'type-designed';
  }

  trackByOrderId(_: number, o: OrderListItem): number { return o.orderId; }
}
