import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
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

  // View Details Modal
  showDetailsModal = false;
  selectedShipmentDetails: ShipmentDetails | null = null;
  isLoadingDetails = false;

  // Assign Driver Modal
  showAssignModal = false;
  selectedShipmentForAssign: Shipment | null = null;
  selectedDriverId: number | null = null;

  ShipmentStatusEnum = ShipmentStatus;

  constructor() { }

  ngOnInit(): void {
    this.loadShipments();
    this.loadDrivers();
  }

  public loadShipments() {
    this.isLoading = true;
    this.shippingService.getAllShipments().subscribe({
      next: (data) => {
        this.allShipments = data;
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
        this.drivers = data;
        // Filter only available drivers for the assignment dropdown
        this.availableDrivers = data.filter(d => {
          const status = this.getNumericStatus(d.status, DriverStatus);
          return status === DriverStatus.Available;
        });
      },
      error: (err) => console.error('Failed to load drivers', err)
    });
  }

  public filterShipments() {
    this.filteredShipments = this.allShipments.filter(s => {
      const matchesSearch = !this.searchTerm || 
        s.id.toString().toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (s.customerName && s.customerName.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (s.deliveryCity && s.deliveryCity.toLowerCase().includes(this.searchTerm.toLowerCase()));

      const currentStatus = this.getNumericStatus(s.shipmentStatus, ShipmentStatus);
      const matchesStatus = this.statusFilter === 'All' || currentStatus === this.statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }

  public openDetailsModal(shipment: Shipment) {
    this.showDetailsModal = true;
    this.isLoadingDetails = true;
    this.shippingService.getShipmentById(shipment.id).subscribe({
      next: (data) => {
        this.selectedShipmentDetails = data;
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
        const errorMessage = err.error?.message || err.error || 'Failed to assign driver. Please ensure the driver is available.';
        alert(errorMessage);
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
