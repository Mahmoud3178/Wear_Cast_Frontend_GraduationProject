import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ShippingService } from '../../../core/services/shipping.service';
import { DriverService } from '../../../core/services/driver.service';
import { Shipment, ShipmentDetails, ShipmentStatus } from '../../../core/models/shipment.model';
import { Driver } from '../../../core/models/driver.model';

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

  loadShipments() {
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

  loadDrivers() {
    this.driverService.getAllDrivers().subscribe({
      next: (data) => {
        this.drivers = data;
      },
      error: (err) => console.error('Failed to load drivers', err)
    });
  }

  filterShipments() {
    this.filteredShipments = this.allShipments.filter(s => {
      const idMatch = s.id.toString().includes(this.searchTerm);
      const destMatch = s.deliveryCity.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
                        s.deliveryStreet.toLowerCase().includes(this.searchTerm.toLowerCase());
      const driverMatch = s.driverName?.toLowerCase().includes(this.searchTerm.toLowerCase()) || false;
      
      const matchesSearch = idMatch || destMatch || driverMatch;
      const matchesStatus = this.statusFilter === 'All' || s.shipmentStatus === this.statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }

  openDetailsModal(shipment: Shipment) {
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

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedShipmentDetails = null;
  }

  openAssignModal(shipment: Shipment) {
    this.selectedShipmentForAssign = shipment;
    this.selectedDriverId = null;
    this.showAssignModal = true;
  }

  closeAssignModal() {
    this.showAssignModal = false;
    this.selectedShipmentForAssign = null;
    this.selectedDriverId = null;
  }

  assignDriver() {
    if (!this.selectedShipmentForAssign || !this.selectedDriverId) return;

    this.shippingService.assignDriver({
      shipmentId: this.selectedShipmentForAssign.id,
      driverId: this.selectedDriverId
    }).subscribe({
      next: () => {
        this.closeAssignModal();
        this.loadShipments();
      },
      error: (err) => {
        console.error('Failed to assign driver', err);
        alert('Failed to assign driver.');
      }
    });
  }

  getStatusName(status: ShipmentStatus): string {
    switch (status) {
      case ShipmentStatus.Pending: return 'Pending';
      case ShipmentStatus.ReadyForPickup: return 'Ready For Pickup';
      case ShipmentStatus.InTransit: return 'In Transit';
      case ShipmentStatus.Delivered: return 'Delivered';
      case ShipmentStatus.Cancelled: return 'Cancelled';
      default: return 'Unknown';
    }
  }
}
