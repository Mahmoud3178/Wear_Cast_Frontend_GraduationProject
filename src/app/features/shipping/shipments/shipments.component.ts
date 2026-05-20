import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ShippingService } from '../../../core/services/shipping.service';
import { DriverService } from '../../../core/services/driver.service';
import { Shipment, ShipmentDetails, ShipmentStatus } from '../../../core/models/shipment.model';
import { Driver, DriverStatus, DeliveryVehicleType } from '../../../core/models/driver.model';

@Component({
  selector: 'app-shipments',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './shipments.component.html',
  styleUrl: './shipments.component.css'
})
export class ShipmentsComponent implements OnInit {
  private shippingService = inject(ShippingService);
  private driverService = inject(DriverService);

  searchTerm: string = '';
  statusFilter: number | 'All' = 'All';

  allShipments: Shipment[] = [];
  filteredShipments: Shipment[] = [];
  drivers: Driver[] = [];
  availableDrivers: Driver[] = [];
  isLoading = true;

  currentPage: number = 1;
  pageSize: number = 10;
  totalRecords: number = 0;
  totalPages: number = 0;
  searchCustomerName = '';
  searchCity = '';
  sortBy = 'Newest';
  
  searchState = '';
  searchStreet = '';
  searchDriverName = '';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  minOrders: number | null = null;
  maxOrders: number | null = null;
  startDate: string | null = null;
  endDate: string | null = null;
  searchDriverNationalId = '';
  
  sortOptions = [
    { value: 'Newest', label: 'Newest' },
    { value: 'PriceAsc', label: 'Price (Low to High)' },
    { value: 'PriceDesc', label: 'Price (High to Low)' },
    { value: 'NumberOfOrdersDesc', label: 'Orders (High to Low)' }
  ];

  // View Details Modal
  showDetailsModal = false;
  selectedShipmentDetails: any | null = null;
  selectedShipmentFixedItems: any[] = [];
  selectedShipmentDesignedItems: any[] = [];
  isLoadingDetails = false;

  // Assign Driver Modal
  showAssignModal = false;
  selectedShipmentForAssign: Shipment | null = null;
  selectedDriverId: number | null = null;

  ShipmentStatusEnum = ShipmentStatus;
  showAdvancedFilters = false;

  constructor() { }

  public clearFilters() {
    this.searchCustomerName = '';
    this.searchCity = '';
    this.searchState = '';
    this.searchStreet = '';
    this.searchDriverName = '';
    this.searchDriverNationalId = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.minOrders = null;
    this.maxOrders = null;
    this.startDate = null;
    this.endDate = null;
    this.sortBy = 'Newest';
    this.statusFilter = 'All';
    this.currentPage = 1;
    this.loadShipments();
  }

  ngOnInit(): void {
    this.loadShipments();
    this.loadDrivers();
  }

  public loadShipments() {
    this.isLoading = true;
    const params: any = {
      PageIndex: this.currentPage,
      PageSize: this.pageSize,
      SortBy: this.sortBy
    };

    if (this.searchCustomerName.trim()) params.CustomerFirstName = this.searchCustomerName.trim();
    if (this.searchCity.trim()) params.DeliveryCity = this.searchCity.trim();
    if (this.searchState.trim()) params.DeliveryState = this.searchState.trim();
    if (this.searchStreet.trim()) params.DeliveryStreet = this.searchStreet.trim();
    if (this.searchDriverName.trim()) params.DriverFirstName = this.searchDriverName.trim();
    if (this.searchDriverNationalId.trim()) params.DriverNationalId = this.searchDriverNationalId.trim();
    
    if (this.minPrice !== null) params.MinPrice = this.minPrice;
    if (this.maxPrice !== null) params.MaxPrice = this.maxPrice;
    if (this.minOrders !== null) params.MinNumberOfOrders = this.minOrders;
    if (this.maxOrders !== null) params.MaxNumberOfOrders = this.maxOrders;
    
    if (this.startDate) params.StartDate = this.startDate;
    if (this.endDate) params.EndDate = this.endDate;

    if (this.statusFilter !== 'All') params.ShipmentStatus = this.statusFilter;

    this.shippingService.getAllShipments(params).subscribe({
      next: (data) => {
        this.allShipments = data.items || [];
        this.totalRecords = data.records;
        this.totalPages = data.pages;
        this.filterShipments();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load shipments', err);
        this.isLoading = false;
      }
    });
  }

  public loadDrivers() {
    this.driverService.getAllDrivers().subscribe({
      next: (data) => {
        const drivers = data.items || [];
        this.drivers = drivers;
        // Filter only available drivers for the assignment dropdown
        this.availableDrivers = drivers.filter((d: any) => {
          const status = this.getNumericStatus(d.status, DriverStatus);
          return status === DriverStatus.Available;
        });
      },
      error: (err) => console.error('Failed to load drivers', err)
    });
  }

  public filterShipments() {
    this.filteredShipments = this.allShipments;
  }

  public nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadShipments();
    }
  }

  public previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadShipments();
    }
  }

  public goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadShipments();
    }
  }

  public openDetailsModal(shipment: Shipment) {
    this.showDetailsModal = true;
    this.isLoadingDetails = true;
    this.selectedShipmentFixedItems = [];
    this.selectedShipmentDesignedItems = [];

    forkJoin({
      details: this.shippingService.getShipmentById(shipment.id),
      ordersData: this.shippingService.getOrdersByShipmentId(shipment.id),
      itemsData: this.shippingService.getShipmentOrderItems(shipment.id)
    }).subscribe({
      next: ({ details, ordersData, itemsData }) => {
        this.selectedShipmentDetails = {
          ...details,
          orders: ordersData?.orders || []
        };
        this.selectedShipmentFixedItems = itemsData?.fixedItems?.items || [];
        this.selectedShipmentDesignedItems = itemsData?.designedItems?.items || [];
        this.isLoadingDetails = false;
      },
      error: (err) => {
        console.error('Failed to load shipment details', err);
        this.isLoadingDetails = false;
      }
    });
  }

  public closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedShipmentDetails = null;
    this.selectedShipmentFixedItems = [];
    this.selectedShipmentDesignedItems = [];
  }

  public openAssignModal(shipment: Shipment) {
    this.selectedShipmentForAssign = shipment;
    this.selectedDriverId = null;
    this.showAssignModal = true;
  }

  public closeAssignModal() {
    this.showAssignModal = false;
    this.selectedShipmentForAssign = null;
    this.selectedDriverId = null;
  }

  public assignDriver() {
    if (!this.selectedShipmentForAssign || !this.selectedDriverId) return;

    this.shippingService.assignDriver({
      shipmentId: this.selectedShipmentForAssign.id,
      driverId: this.selectedDriverId
    }).subscribe({
      next: () => {
        this.closeAssignModal();
        this.loadShipments();
        this.loadDrivers(); // Refresh drivers list to update availability
      },
      error: (err) => {
        console.error('Failed to assign driver', err);
        const errorMessage = err.error?.message || err.error || 'Failed to assign driver. Please ensure the driver is available and the shipment is Unassigned.';
        alert(errorMessage);
      }
    });
  }

  public unassignShipment(shipmentId: number) {
    if (!confirm('Are you sure you want to unassign the driver from this shipment?')) return;

    this.isLoading = true;
    this.shippingService.unassignDriver(shipmentId).subscribe({
      next: () => {
        this.loadShipments();
        this.loadDrivers(); // Refresh availability
      },
      error: (err) => {
        console.error('Failed to unassign driver', err);
        const errorMessage = err.error?.message || err.error || 'Failed to unassign driver.';
        alert(errorMessage);
        this.isLoading = false;
      }
    });
  }

  public getStatusName(status: any): string {
    const s = this.getNumericStatus(status, ShipmentStatus);
    switch (s) {
      case ShipmentStatus.Pending: return 'Pending';
      case ShipmentStatus.Unassigned: return 'Unassigned';
      case ShipmentStatus.Assigned: return 'Assigned';
      case ShipmentStatus.PickingUp: return 'Picking Up';
      case ShipmentStatus.OutForDelivery: return 'Out for Delivery';
      case ShipmentStatus.Delivered: return 'Delivered';
      default: return 'Unknown';
    }
  }

  public getVehicleTypeName(type: any): string {
    const t = this.getNumericStatus(type, DeliveryVehicleType);
    switch (t) {
      case DeliveryVehicleType.Bicycle: return 'Bicycle';
      case DeliveryVehicleType.Motorcycle: return 'Motorcycle';
      case DeliveryVehicleType.Car: return 'Car';
      case DeliveryVehicleType.Van: return 'Van';
      default: return 'Vehicle';
    }
  }

  public getStatusBadgeClass(status: any): string {
    const s = this.getNumericStatus(status, ShipmentStatus);
    switch (s) {
      case ShipmentStatus.Pending: return 'status-pending';
      case ShipmentStatus.Unassigned: return 'status-unassigned';
      case ShipmentStatus.Assigned: return 'status-assigned';
      case ShipmentStatus.PickingUp:
      case ShipmentStatus.OutForDelivery: return 'status-transit';
      case ShipmentStatus.Delivered: return 'status-delivered';
      default: return 'status-unknown';
    }
  }

  public isStepActive(currentStatus: any, stepValue: number): boolean {
    const s = this.getNumericStatus(currentStatus, ShipmentStatus);
    return s >= stepValue;
  }

  public getNumericStatus(status: any, enumObj: any): number {
    if (status === null || status === undefined) return -1;
    if (typeof status === 'number') return status;
    if (typeof status === 'string') {
      if (!isNaN(Number(status))) return Number(status);
      return enumObj[status as keyof typeof enumObj] as unknown as number;
    }
    return -1;
  }

  public openCreateShipmentModal() {
    alert('Note: Shipments are automatically generated when a customer completes a payment via Stripe. Manual shipment creation is currently disabled to ensure sync with the order system.');
  }
}
