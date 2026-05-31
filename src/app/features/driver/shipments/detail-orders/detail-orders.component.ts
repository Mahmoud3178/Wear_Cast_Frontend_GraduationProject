import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DriverService } from '../../../../core/services/driver.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ShipmentStatus } from '../../../../core/models/shipment.model';
import { forkJoin, map, of } from 'rxjs';

interface DetailedOrder {
  orderId: number;
  shipmentId: number;
  vendorName: string;
  vendorPhoneNumber: string;
  vendorCity: string;
  vendorStreet: string;
  vendorState: string;
  vendorBuilding?: string;
  orderType: string;
  itemsCount: number;
  status: string;
  orderTime: string;
}

@Component({
  selector: 'app-detail-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './detail-orders.component.html',
  styleUrl: './detail-orders.component.css'
})
export class DetailOrdersComponent implements OnInit {
  private driverService = inject(DriverService);
  private authService = inject(AuthService);

  isLoading = false;
  errorMessage = '';
  successMessage = '';
  searchQuery = '';
  vendorName = '';
  vendorCity = '';
  selectedStatus: string | null = null;
  orderIdSearch = '';
  sortBy = 1; // 1 = Newest, 2 = Oldest
  
  allOrders: DetailedOrder[] = [];
  filteredOrders: DetailedOrder[] = [];

  get totalOrdersCount(): number {
    return this.allOrders.length;
  }

  get readyOrdersCount(): number {
    return this.allOrders.filter(o => o.status === 'Ready').length;
  }

  get pickedUpOrdersCount(): number {
    return this.allOrders.filter(o => o.status === 'PickedUp').length;
  }

  get activeShipmentsCount(): number {
    const shipmentIds = this.allOrders.map(o => o.shipmentId);
    return new Set(shipmentIds).size;
  }

  ngOnInit(): void {
    this.loadAllOrders();
  }

  loadAllOrders() {
    const driverId = this.authService.getDriverId();
    if (!driverId) {
      this.errorMessage = 'Driver profile session not found.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Step 1: Load all driver orders directly from backend
    this.driverService.getDriverOrders(driverId).subscribe({
      next: (response) => {
        if (!response || !response.items) {
          this.allOrders = [];
          this.filteredOrders = [];
          this.isLoading = false;
          return;
        }

        const consolidatedOrders: DetailedOrder[] = response.items.map((apiOrder: any) => {
          let currentStatus = apiOrder.orderStatus ?? apiOrder.OrderStatus;
          
          if (currentStatus === 0) currentStatus = 'Pending';
          if (currentStatus === 1) currentStatus = 'Paid';
          if (currentStatus === 5) currentStatus = 'Ready';
          if (currentStatus === 6) currentStatus = 'PickedUp';

          // Ensure local override still works for immediate feedback
          const localKey = `shipment_${apiOrder.shipmentId || apiOrder.ShipmentId}_order_${apiOrder.orderId || apiOrder.OrderId}_picked`;
          const wasPickedLocal = localStorage.getItem(localKey) === 'true';
          if (wasPickedLocal) {
             currentStatus = 'PickedUp';
          }

          const vAddress = apiOrder.vendorAddress ?? apiOrder.VendorAddress ?? {};

          return {
            orderId: apiOrder.orderId ?? apiOrder.OrderId,
            shipmentId: apiOrder.shipmentId ?? apiOrder.ShipmentId,
            vendorName: apiOrder.vendorName ?? apiOrder.VendorName ?? 'Unknown Vendor',
            vendorPhoneNumber: apiOrder.vendorPhoneNumber ?? apiOrder.VendorPhoneNumber ?? '',
            vendorCity: vAddress.city ?? vAddress.City ?? '',
            vendorStreet: vAddress.street ?? vAddress.Street ?? '',
            vendorState: vAddress.state ?? vAddress.State ?? '',
            vendorBuilding: vAddress.buildingNumber ?? vAddress.BuildingNumber ?? '',
            orderType: apiOrder.orderType === 0 ? 'Fixed' : 'Designed',
            itemsCount: apiOrder.numberOfItems ?? apiOrder.NumberOfItems ?? 0,
            status: currentStatus,
            orderTime: apiOrder.createdOn ?? apiOrder.CreatedOn ?? new Date().toISOString()
          };
        });

        this.allOrders = consolidatedOrders;
        this.applyFilter();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load driver orders', err);
        this.errorMessage = 'Failed to load driver orders.';
        this.isLoading = false;
      }
    });
  }

  applyFilter() {
    let filtered = [...this.allOrders];

    if (this.vendorName) {
      const q = this.vendorName.trim().toLowerCase();
      filtered = filtered.filter(o => o.vendorName.toLowerCase().includes(q));
    }
    if (this.vendorCity) {
      const q = this.vendorCity.trim().toLowerCase();
      filtered = filtered.filter(o => o.vendorCity.toLowerCase().includes(q));
    }
    if (this.orderIdSearch) {
      const q = this.orderIdSearch.trim().toLowerCase();
      filtered = filtered.filter(o => 
        o.orderId.toString().includes(q) || 
        o.shipmentId.toString().includes(q)
      );
    }
    if (this.selectedStatus) {
      const q = this.selectedStatus.trim().toLowerCase();
      filtered = filtered.filter(o => o.status.toLowerCase() === q);
    }

    // Sort by orderTime based on sortBy
    if (this.sortBy === 1) {
      filtered.sort((a, b) => new Date(b.orderTime).getTime() - new Date(a.orderTime).getTime());
    } else {
      filtered.sort((a, b) => new Date(a.orderTime).getTime() - new Date(b.orderTime).getTime());
    }

    this.filteredOrders = filtered;
  }

  clearFilters() {
    this.vendorName = '';
    this.vendorCity = '';
    this.selectedStatus = null;
    this.orderIdSearch = '';
    this.sortBy = 1;
    this.applyFilter();
  }

  updateOrderPickedUp(order: DetailedOrder) {
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    this.driverService.updateOrderStatus(order.orderId, 6).subscribe({
      next: () => {
        this.isLoading = false;
        order.status = 'PickedUp';
        localStorage.setItem(`shipment_${order.shipmentId}_order_${order.orderId}_picked`, 'true');
        
        this.successMessage = `Order #${order.orderId} marked as Picked Up!`;
        setTimeout(() => this.successMessage = '', 3000);
        
        // Reload details to sync full parent shipment state from backend
        this.loadAllOrders();
      },
      error: (err) => {
        console.error('Failed to update order status', err);
        this.isLoading = false;
        
        let details = '';
        if (err.error) {
          if (typeof err.error === 'string') {
            details = err.error;
          } else {
            const apiError = err.error.error || err.error;
            if (apiError && apiError.message) {
              details = `${apiError.message} (${apiError.code || 'Error'})`;
            } else if (err.error.message) {
              details = err.error.message;
            } else if (err.error.errors) {
              const errsObj = err.error.errors;
              details = Object.keys(errsObj)
                .map(key => `${key}: ${errsObj[key].join(', ')}`)
                .join('; ');
            } else if (err.error.title) {
              details = err.error.title;
            } else {
              details = JSON.stringify(err.error);
            }
          }
        } else if (err.message) {
          details = err.message;
        }

        this.errorMessage = `Failed to mark Order #${order.orderId} as Picked Up. Details: ${details || 'Unknown error'}`;
      }
    });
  }
}
