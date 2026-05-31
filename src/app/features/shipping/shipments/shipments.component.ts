import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { DriverService } from '../../../core/services/driver.service';
import { DriverStatus, DeliveryVehicleType } from '../../../core/models/driver.model';

// ─── Interfaces matching actual backend DTOs ────────────────────────────────

export interface ShipmentListItem {
  id: number;
  orderTime: string;
  shipmentStatus: string;   // string enum from backend e.g. "Assigned"
  price: number;
  numberOfOrders: number;
  deliveryState: string;
  deliveryCity: string;
  deliveryStreet: string;
  deliveryCode: string;
  driverName: string | null;
  customerName: string;
}

export interface PaginatedShipments {
  items: ShipmentListItem[];
  records: number;
  pages: number;
}

export interface DriverListItem {
  id: number;
  driverName?: string;
  name?: string;
  status: any;
  vehicleType?: any;
  vehiclePlateNumber?: string;
  driverCity?: string;
  numberOfAssignedShipments?: number;
  numberOfActiveShipments?: number;
  numberOfDeliveredShipments?: number;
}


@Component({
  selector: 'app-shipments',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './shipments.component.html',
  styleUrl: './shipments.component.css'
})
export class ShipmentsComponent implements OnInit {
  private http = inject(HttpClient);
  private driverService = inject(DriverService);
  private apiUrl = `${environment.apiUrl}/api`;

  // ── Data ──────────────────────────────────────────────────────
  shipments: ShipmentListItem[] = [];
  availableDrivers: DriverListItem[] = [];
  isLoading = true;
  isAssigning = false;

  // ── Pagination ────────────────────────────────────────────────
  currentPage = 1;
  pageSize = 10;
  totalRecords = 0;
  totalPages = 0;

  // ── Filters ───────────────────────────────────────────────────
  searchCustomerName = '';
  searchCity = '';
  searchState = '';
  searchStreet = '';
  searchDriverName = '';
  searchDriverNationalId = '';
  statusFilter = '';
  sortBy = 'Newest';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  minOrders: number | null = null;
  maxOrders: number | null = null;
  startDate = '';
  endDate = '';
  showAdvancedFilters = false;

  sortOptions = [
    { value: 'Newest',             label: 'Newest First' },
    { value: 'PriceAsc',           label: 'Price ↑' },
    { value: 'PriceDesc',          label: 'Price ↓' },
    { value: 'NumberOfOrdersDesc', label: 'Orders ↓' }
  ];

  statusOptions = [
    { value: '',              label: 'All Statuses' },
    { value: '1',             label: 'Pending' },
    { value: '2',             label: 'Unassigned' },
    { value: '3',             label: 'Assigned' },
    { value: '4',             label: 'Picking Up' },
    { value: '5',             label: 'Out for Delivery' },
    { value: '6',             label: 'Delivered' }
  ];

  // ── Assign modal ──────────────────────────────────────────────
  showAssignModal = false;
  selectedShipment: ShipmentListItem | null = null;
  selectedDriverId: number | null = null;
  isLoadingDrivers = false;
  searchDriverModalText = '';

  get filteredDrivers() {
    if (!this.searchDriverModalText) return this.availableDrivers;
    const term = this.searchDriverModalText.toLowerCase();
    return this.availableDrivers.filter(d => 
      (d.driverName?.toLowerCase() || '').includes(term) ||
      (d.driverCity?.toLowerCase() || '').includes(term)
    );
  }

  // ── Unassign modal ────────────────────────────────────────────
  showUnassignModal = false;
  unassignTarget: ShipmentListItem | null = null;
  isUnassigning = false;

  // ── Toast ─────────────────────────────────────────────────────
  successMessage = '';
  errorMessage = '';

  ngOnInit(): void {
    this.loadShipments();
  }

  // ─── Load Shipments ──────────────────────────────────────────

  loadShipments(): void {
    this.isLoading = true;

    let params = new HttpParams()
      .set('PageIndex', this.currentPage)
      .set('PageSize', this.pageSize)
      .set('SortBy', this.sortBy);

    if (this.searchCustomerName.trim()) params = params.set('CustomerFirstName', this.searchCustomerName.trim());
    if (this.searchCity.trim())         params = params.set('DeliveryCity', this.searchCity.trim());
    if (this.searchState.trim())        params = params.set('DeliveryState', this.searchState.trim());
    if (this.searchStreet.trim())       params = params.set('DeliveryStreet', this.searchStreet.trim());
    if (this.searchDriverName.trim())   params = params.set('DriverFirstName', this.searchDriverName.trim());
    if (this.searchDriverNationalId.trim()) params = params.set('DriverNationalId', this.searchDriverNationalId.trim());
    if (this.statusFilter)              params = params.set('ShipmentStatus', this.statusFilter);
    if (this.minPrice !== null)         params = params.set('MinPrice', this.minPrice);
    if (this.maxPrice !== null)         params = params.set('MaxPrice', this.maxPrice);
    if (this.minOrders !== null)        params = params.set('MinNumberOfOrders', this.minOrders);
    if (this.maxOrders !== null)        params = params.set('MaxNumberOfOrders', this.maxOrders);
    if (this.startDate)                 params = params.set('StartDate', this.startDate);
    if (this.endDate)                   params = params.set('EndDate', this.endDate);

    this.http.get<PaginatedShipments>(`${this.apiUrl}/Shipments`, { params }).subscribe({
      next: (data) => {
        this.shipments = data.items ?? [];
        this.totalRecords = data.records ?? 0;
        this.totalPages = data.pages ?? 0;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load shipments', err);
        this.isLoading = false;
      }
    });
  }

  // ─── Pagination ──────────────────────────────────────────────

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadShipments();
    }
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    const cur = this.currentPage;
    const delta = 2;
    const pages: number[] = [];
    for (let i = Math.max(1, cur - delta); i <= Math.min(total, cur + delta); i++) {
      pages.push(i);
    }
    return pages;
  }

  // ─── Filters ─────────────────────────────────────────────────

  clearFilters(): void {
    this.searchCustomerName = '';
    this.searchCity = '';
    this.searchState = '';
    this.searchStreet = '';
    this.searchDriverName = '';
    this.searchDriverNationalId = '';
    this.statusFilter = '';
    this.sortBy = 'Newest';
    this.minPrice = null;
    this.maxPrice = null;
    this.minOrders = null;
    this.maxOrders = null;
    this.startDate = '';
    this.endDate = '';
    this.currentPage = 1;
    this.loadShipments();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadShipments();
  }

  // ─── Status helpers ──────────────────────────────────────────

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      'Pending':         'Pending',
      'Unassigned':      'Unassigned',
      'Assigned':        'Assigned',
      'PickingUp':       'Picking Up',
      'OutForDelivery':  'Out for Delivery',
      'Delivered':       'Delivered'
    };
    return map[status] ?? status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'Pending':         'st-pending',
      'Unassigned':      'st-unassigned',
      'Assigned':        'st-assigned',
      'PickingUp':       'st-picking',
      'OutForDelivery':  'st-transit',
      'Delivered':       'st-delivered'
    };
    return map[status] ?? 'st-pending';
  }

  canAssign(status: string): boolean {
    return status === 'Unassigned';
  }

  canUnassign(status: string): boolean {
    return status === 'Assigned';
  }

  // ─── Assign ──────────────────────────────────────────────────

  openAssignModal(shipment: ShipmentListItem): void {
    this.selectedShipment = shipment;
    this.selectedDriverId = null;
    this.searchDriverModalText = '';
    this.showAssignModal = true;
    this.loadAvailableDrivers();
  }

  closeAssignModal(): void {
    this.showAssignModal = false;
    this.selectedShipment = null;
    this.selectedDriverId = null;
  }

  loadAvailableDrivers(): void {
    this.isLoadingDrivers = true;
    this.driverService.getAllDrivers({ PageSize: 100 }).subscribe({
      next: (data: any) => {
        const all: DriverListItem[] = data.items ?? data ?? [];
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
    if (!this.selectedShipment || !this.selectedDriverId) return;
    this.isAssigning = true;

    this.http.put<void>(
      `${this.apiUrl}/Shipments/${this.selectedShipment.id}/assign`,
      { driverId: this.selectedDriverId }
    ).subscribe({
      next: () => {
        this.isAssigning = false;
        this.closeAssignModal();
        this.showToast('Driver assigned successfully!', 'success');
        this.loadShipments();
      },
      error: (err) => {
        this.isAssigning = false;
        const msg = err?.error?.message || err?.error?.error?.message || 'Failed to assign driver.';
        this.showToast(msg, 'error');
      }
    });
  }

  // ─── Unassign ────────────────────────────────────────────────

  openUnassignModal(shipment: ShipmentListItem): void {
    this.unassignTarget = shipment;
    this.showUnassignModal = true;
  }

  closeUnassignModal(): void {
    this.showUnassignModal = false;
    this.unassignTarget = null;
  }

  confirmUnassign(): void {
    if (!this.unassignTarget) return;
    this.isUnassigning = true;

    this.http.put<void>(`${this.apiUrl}/Shipments/${this.unassignTarget.id}/unassign`, {})
      .subscribe({
        next: () => {
          this.isUnassigning = false;
          this.closeUnassignModal();
          this.showToast('Driver unassigned successfully!', 'success');
          this.loadShipments();
        },
        error: (err) => {
          this.isUnassigning = false;
          const msg = err?.error?.message || err?.error?.error?.message || 'Failed to unassign driver.';
          this.showToast(msg, 'error');
        }
      });
  }

  // ─── Toast ───────────────────────────────────────────────────

  showToast(msg: string, type: 'success' | 'error'): void {
    if (type === 'success') {
      this.successMessage = msg;
      setTimeout(() => this.successMessage = '', 4000);
    } else {
      this.errorMessage = msg;
      setTimeout(() => this.errorMessage = '', 6000);
    }
  }

  getDriverLabel(d: DriverListItem): string {
    return d.driverName || d.name || `Driver #${d.id}`;
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

  trackById(_: number, item: any): number { return item.id; }
}
