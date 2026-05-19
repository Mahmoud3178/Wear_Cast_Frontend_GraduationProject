import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ShippingCompanyService } from '../../../core/services/shipping-company.service';
import { OrderService } from '../../../core/services/order.service';
import { ShippingService } from '../../../core/services/shipping.service';
import { environment } from '../../../../environments/environment';

export enum OrderStatus {
  Pending = 0,
  Paid = 1,
  Failed = 2,
  Cancelled = 3,
  Refunded = 4,
  Ready = 5,
  PickedUp = 6
}

export enum OrderType {
  Fixed = 0,
  Designed = 1
}

export enum ShipmentStatus {
  Pending = 0,
  Unassigned = 1,
  Assigned = 2,
  PickingUp = 3,
  OutForDelivery = 4,
  Delivered = 5
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css'
})
export class OrdersComponent implements OnInit {
  private shippingCompanyService = inject(ShippingCompanyService);
  private orderService = inject(OrderService);
  private shippingService = inject(ShippingService);

  orders: any[] = [];
  isLoading = false;
  isLoadingDetails = false;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalRecords = 0;
  totalPages = 0;

  // Filters & Sorting
  searchTerm = '';
  statusFilter: number | 'All' = 'All';
  typeFilter: number | 'All' = 'All';
  shipmentStatusFilter: number | 'All' = 'All';
  sortBy = 1; // Default to Newest (1)

  // Details Drawer/Modal
  selectedOrder: any | null = null;
  selectedOrderItems: any[] = [];
  selectedOrderDesignedItems: any[] = [];
  showDetailsDrawer = false;

  // Status Change Dialog
  showStatusModal = false;
  orderToUpdateStatus: any | null = null;
  newStatusValue: number = 0;

  OrderStatusEnum = OrderStatus;
  OrderTypeEnum = OrderType;
  ShipmentStatusEnum = ShipmentStatus;
  apiUrl = environment.apiUrl;

  sortOptions = [
    { value: 1, label: 'Newest first' },
    { value: 2, label: 'Oldest first' },
    { value: 18, label: 'Items: Low to High' },
    { value: 19, label: 'Items: High to Low' }
  ];

  statusList = [
    { value: OrderStatus.Pending, label: 'Pending' },
    { value: OrderStatus.Paid, label: 'Paid' },
    { value: OrderStatus.Failed, label: 'Failed' },
    { value: OrderStatus.Cancelled, label: 'Cancelled' },
    { value: OrderStatus.Refunded, label: 'Refunded' },
    { value: OrderStatus.Ready, label: 'Ready' },
    { value: OrderStatus.PickedUp, label: 'Picked Up' }
  ];

  shipmentStatusList = [
    { value: ShipmentStatus.Unassigned, label: 'Unassigned (Awaiting Driver)' },
    { value: ShipmentStatus.PickingUp, label: 'Picking Up' },
    { value: ShipmentStatus.OutForDelivery, label: 'Out for Delivery' },
    { value: ShipmentStatus.Delivered, label: 'Delivered' }
  ];

  get totalPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get visiblePages(): (number | string)[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const pages: (number | string)[] = [];
    const boundary = 2; // Pages to display on each side of the current page

    if (total <= 9) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
      return pages;
    }

    pages.push(1);

    const start = Math.max(2, current - boundary);
    const end = Math.min(total - 1, current + boundary);

    if (start > 2) {
      pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < total - 1) {
      pages.push('...');
    }

    pages.push(total);

    return pages;
  }

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.isLoading = true;
    const params: any = {
      PageIndex: this.currentPage,
      PageSize: this.pageSize,
      SortBy: this.sortBy
    };

    if (this.statusFilter !== 'All') {
      params.OrderStatus = this.statusFilter;
    }

    if (this.typeFilter !== 'All') {
      params.OrderType = this.typeFilter;
    }

    if (this.shipmentStatusFilter !== 'All') {
      params.ShipmentStatus = this.shipmentStatusFilter;
    }

    if (this.searchTerm.trim()) {
      params.VendorCity = this.searchTerm.trim();
    }

    this.shippingCompanyService.getOrders(params).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        this.orders = data?.items || [];
        this.totalRecords = data?.records || 0;
        this.totalPages = data?.pages || 0;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load orders', err);
        this.isLoading = false;
      }
    });
  }

  applyFilters() {
    this.currentPage = 1;
    this.loadOrders();
  }

  clearFilters() {
    this.searchTerm = '';
    this.statusFilter = 'All';
    this.typeFilter = 'All';
    this.shipmentStatusFilter = 'All';
    this.sortBy = 1;
    this.currentPage = 1;
    this.loadOrders();
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadOrders();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadOrders();
    }
  }

  goToPage(page: number | string) {
    const num = typeof page === 'string' ? parseInt(page, 10) : page;
    if (!isNaN(num) && num >= 1 && num <= this.totalPages) {
      this.currentPage = num;
      this.loadOrders();
    }
  }

  viewOrderDetails(order: any) {
    this.selectedOrder = order;
    this.selectedOrderItems = [];
    this.selectedOrderDesignedItems = [];
    this.isLoadingDetails = true;
    this.showDetailsDrawer = true;

    this.shippingCompanyService.getOrderDetails(order.orderId).subscribe({
      next: (res: any) => {
        const details = res?.data ?? res;
        // Merge full recipient, address & payout info from the return object if available
        if (details) {
          this.selectedOrder = {
            ...this.selectedOrder,
            ...details
          };
          this.selectedOrderItems = details.items || [];
          this.selectedOrderDesignedItems = details.designedItems || [];
        }
        this.isLoadingDetails = false;
      },
      error: (err) => {
        console.error('Failed to load order details items', err);
        this.isLoadingDetails = false;
      }
    });
  }

  closeDetailsDrawer() {
    this.showDetailsDrawer = false;
    this.selectedOrder = null;
    this.selectedOrderItems = [];
    this.selectedOrderDesignedItems = [];
  }

  openStatusModal(order: any) {
    this.orderToUpdateStatus = order;
    this.newStatusValue = this.getNumericStatus(order.shipmentStatus, ShipmentStatus);
    this.showStatusModal = true;
  }

  closeStatusModal() {
    this.showStatusModal = false;
    this.orderToUpdateStatus = null;
  }

  updateOrderStatus() {
    if (!this.orderToUpdateStatus) return;

    const shipmentId = this.orderToUpdateStatus.shipmentId;
    if (!shipmentId) {
      alert("No shipment record is currently associated with this order.");
      return;
    }

    this.shippingService.updateShipmentStatus(shipmentId, this.newStatusValue).subscribe({
      next: () => {
        this.closeStatusModal();
        this.loadOrders();
        // If details drawer is open for this order, refresh details
        if (this.showDetailsDrawer && this.selectedOrder?.orderId === this.orderToUpdateStatus.orderId) {
          this.viewOrderDetails(this.selectedOrder);
        }
      },
      error: (err) => {
        console.error('Failed to update shipment status', err);
        let errMsg = 'Failed to update shipment status. Role or transition constraints may prevent this action.';

        if (err.error) {
          if (typeof err.error === 'string') {
            errMsg = err.error;
          } else if (err.error.message) {
            errMsg = err.error.message;
          } else if (err.error.title) {
            errMsg = err.error.title;
          } else if (err.error.errors) {
            const validationErrors = err.error.errors;
            const messages = [];
            for (const key in validationErrors) {
              if (validationErrors.hasOwnProperty(key)) {
                const item = validationErrors[key];
                if (Array.isArray(item)) {
                  messages.push(...item);
                } else if (typeof item === 'string') {
                  messages.push(item);
                }
              }
            }
            if (messages.length > 0) {
              errMsg = messages.join('\n');
            }
          } else {
            errMsg = JSON.stringify(err.error);
          }
        } else if (err.message) {
          errMsg = err.message;
        }

        alert(errMsg);
      }
    });
  }

  // Helper formatting methods
  getStatusLabel(status: any): string {
    const s = this.getNumericStatus(status, OrderStatus);
    switch (s) {
      case OrderStatus.Pending: return 'Pending';
      case OrderStatus.Paid: return 'Paid';
      case OrderStatus.Failed: return 'Failed';
      case OrderStatus.Cancelled: return 'Cancelled';
      case OrderStatus.Refunded: return 'Refunded';
      case OrderStatus.Ready: return 'Ready';
      case OrderStatus.PickedUp: return 'Picked Up';
      default: return 'Unknown';
    }
  }

  getStatusBadgeClass(status: any): string {
    const s = this.getNumericStatus(status, OrderStatus);
    switch (s) {
      case OrderStatus.Paid: return 'status-success';
      case OrderStatus.Ready: return 'status-info';
      case OrderStatus.PickedUp: return 'status-info';
      case OrderStatus.Pending: return 'status-warning';
      case OrderStatus.Failed:
      case OrderStatus.Cancelled: return 'status-danger';
      default: return 'status-secondary';
    }
  }

  getShipmentStatusLabel(status: any): string {
    const s = this.getNumericStatus(status, ShipmentStatus);
    switch (s) {
      case ShipmentStatus.Pending: return 'Pending';
      case ShipmentStatus.Unassigned: return 'Unassigned';
      case ShipmentStatus.Assigned: return 'Assigned';
      case ShipmentStatus.PickingUp: return 'Picking Up';
      case ShipmentStatus.OutForDelivery: return 'Out for Delivery';
      case ShipmentStatus.Delivered: return 'Delivered';
      default: return 'Pending';
    }
  }

  getShipmentStatusBadgeClass(status: any): string {
    const s = this.getNumericStatus(status, ShipmentStatus);
    switch (s) {
      case ShipmentStatus.Delivered: return 'status-success';
      case ShipmentStatus.OutForDelivery:
      case ShipmentStatus.PickingUp: return 'status-info';
      case ShipmentStatus.Assigned: return 'status-info';
      case ShipmentStatus.Unassigned: return 'status-warning';
      default: return 'status-secondary';
    }
  }

  getNumericStatus(status: any, enumObj: any): number {
    if (status === null || status === undefined) return -1;
    if (typeof status === 'number') return status;
    if (typeof status === 'string') {
      if (!isNaN(Number(status))) return Number(status);
      return enumObj[status as keyof typeof enumObj] as unknown as number;
    }
    return -1;
  }

  resolveImageUrl(img: string | null): string {
    if (!img) return 'assets/images/placeholder.png';
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    return `${this.apiUrl}/${img}`;
  }
}
