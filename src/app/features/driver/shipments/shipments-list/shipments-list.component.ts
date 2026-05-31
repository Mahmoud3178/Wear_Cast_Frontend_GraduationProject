import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { DriverService } from '../../../../core/services/driver.service';
import { DriverShipment, ShipmentStatus } from '../../../../core/models/shipment.model';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-shipments-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './shipments-list.component.html',
  styleUrl: './shipments-list.component.css'
})
export class ShipmentsListComponent implements OnInit {
  private driverService = inject(DriverService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  shipments: DriverShipment[] = [];
  isLoading = false;
  errorMessage = '';

  pageIndex = 1;
  pageSize = 100;
  
  // Basic filters
  customerName = ''; 
  deliveryCity = '';
  deliveryStreet = '';
  selectedStatus: string | null = null;
  sortBy: number = 1;

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.selectedStatus = params['status'] || null;
      this.deliveryCity = params['city'] || '';
      this.customerName = params['customer'] || '';
      this.deliveryStreet = params['street'] || '';
      this.sortBy = params['sortBy'] ? +params['sortBy'] : 1;
      
      this.loadShipments();
    });
  }

  clearFilters() {
    this.customerName = '';
    this.deliveryCity = '';
    this.deliveryStreet = '';
    this.selectedStatus = null;
    this.sortBy = 1;
    
    // Clear URL params as well by calling onSearchChange
    this.onSearchChange();
  }

  getQueryParams() {
    return {
      status: this.selectedStatus || null,
      city: this.deliveryCity || null,
      customer: this.customerName || null,
      street: this.deliveryStreet || null,
      sortBy: this.sortBy
    };
  }

  onSearchChange() {
    this.pageIndex = 1; // Reset to first page
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.getQueryParams(),
      queryParamsHandling: 'merge'
    });
  }

  loadShipments() {
    this.isLoading = true;
    const driverId = this.authService.getDriverId();
    
    if (!driverId) {
      console.error('Driver ID not found in token');
      this.errorMessage = 'Driver ID not found. Please log in again.';
      this.isLoading = false;
      return;
    }

    const filters: any = {
      DriverId: driverId,
      PageIndex: this.pageIndex,
      PageSize: this.pageSize,
      SortBy: this.sortBy
    };

    if (this.selectedStatus && this.selectedStatus !== '') filters.ShipmentStatus = this.selectedStatus;
    if (this.deliveryCity) filters.DeliveryCity = this.deliveryCity;
    if (this.deliveryStreet) filters.DeliveryStreet = this.deliveryStreet;
    
    // Custom name parsing
    if (this.customerName && this.customerName.trim() !== '') {
      const parts = this.customerName.trim().split(' ');
      if (parts.length > 1) {
        filters.CustomerFirstName = parts[0];
        filters.CustomerLastName = parts.slice(1).join(' ');
      } else {
        filters.CustomerFirstName = this.customerName.trim();
      }
    }

    this.driverService.getAllDriverShipments(filters).subscribe({
      next: (data: any) => {
        // Handle PaginatedResponse logic where items are in .items
        this.shipments = data.items || data.Items || data || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load shipments', err);
        this.errorMessage = 'Failed to load shipments from server.';
        this.isLoading = false;
      }
    });
  }

  getStatusClass(status: any): string {
    const s = status?.toString() || '';
    if (s === 'Delivered' || s === '6') return 'bg-success-soft text-success';
    if (s === 'OutForDelivery' || s === '5') return 'bg-primary-soft text-primary';
    if (s === 'PickingUp' || s === '4') return 'bg-warning-soft text-warning';
    if (s === 'Assigned' || s === '3') return 'bg-info-soft text-info';
    return 'bg-slate-100 text-slate-500';
  }

  getStatusName(status: any): string {
    const s = status?.toString() || '';
    if (s === 'Delivered' || s === '6') return 'Delivered';
    if (s === 'OutForDelivery' || s === '5') return 'Out For Delivery';
    if (s === 'PickingUp' || s === '4') return 'Picking Up';
    if (s === 'Assigned' || s === '3') return 'Assigned';
    return s;
  }
}
