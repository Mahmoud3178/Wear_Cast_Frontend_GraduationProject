import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
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
  private authService = inject(AuthService);

  shipments: DriverShipment[] = [];
  filteredShipments: DriverShipment[] = [];
  isLoading = false;
  errorMessage = '';

  searchTerm = '';
  selectedStatus = '';

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['status']) {
        this.selectedStatus = params['status'];
      }
      this.loadShipments();
    });
  }

  loadShipments() {
    this.isLoading = true;
    const driverId = this.authService.getDriverId();
    
    if (!driverId) {
      console.error('Driver ID not found in token');
      this.errorMessage = 'Driver ID not found. Please log in again.';
      this.isLoading = false;
      this.loadMockData();
      return;
    }

    this.driverService.getAllDriverShipments(driverId).subscribe({
      next: (data) => {
        this.shipments = data;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load shipments', err);
        this.errorMessage = 'Failed to load shipments from server.';
        this.isLoading = false;
        // Fallback to mock data if API fails or returns empty
        this.loadMockData();
      }
    });
  }

  loadMockData() {
    this.shipments = [
      { id: 101, deliveryCity: 'Gaza', deliveryStreet: 'Al-Wehda St', shipmentStatus: ShipmentStatus.Delivered, orderTime: new Date().toISOString() },
      { id: 102, deliveryCity: 'Rafah', deliveryStreet: 'Main St', shipmentStatus: ShipmentStatus.OutForDelivery, orderTime: new Date().toISOString() },
      { id: 103, deliveryCity: 'Khan Younis', deliveryStreet: 'Al-Bahr St', shipmentStatus: ShipmentStatus.Assigned, orderTime: new Date().toISOString() },
      { id: 104, deliveryCity: 'Gaza', deliveryStreet: 'Remal', shipmentStatus: ShipmentStatus.PickingUp, orderTime: new Date().toISOString() }
    ] as any[];
    this.applyFilters();
  }

  applyFilters() {
    this.filteredShipments = this.shipments.filter(s => {
      const matchesSearch = s.id.toString().includes(this.searchTerm) || 
                            s.deliveryCity?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                            s.deliveryStreet?.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesStatus = !this.selectedStatus || s.shipmentStatus.toString() === this.selectedStatus;
      
      return matchesSearch && matchesStatus;
    });
  }

  getStatusClass(status: any): string {
    const s = status.toString();
    if (s === 'Delivered' || s === '6' || s === ShipmentStatus.Delivered.toString()) return 'bg-success-soft text-success';
    if (s === 'OutForDelivery' || s === '5' || s === ShipmentStatus.OutForDelivery.toString()) return 'bg-primary-soft text-primary';
    if (s === 'PickingUp' || s === '4' || s === ShipmentStatus.PickingUp.toString()) return 'bg-warning-soft text-warning';
    if (s === 'Assigned' || s === '3' || s === ShipmentStatus.Assigned.toString()) return 'bg-info-soft text-info';
    return 'bg-slate-100 text-slate-500';
  }

  getStatusName(status: any): string {
    const s = status.toString();
    if (s === 'Delivered' || s === '6' || s === ShipmentStatus.Delivered.toString()) return 'Delivered';
    if (s === 'OutForDelivery' || s === '5' || s === ShipmentStatus.OutForDelivery.toString()) return 'Out For Delivery';
    if (s === 'PickingUp' || s === '4' || s === ShipmentStatus.PickingUp.toString()) return 'Picking Up';
    if (s === 'Assigned' || s === '3' || s === ShipmentStatus.Assigned.toString()) return 'Assigned';
    return s;
  }
}
