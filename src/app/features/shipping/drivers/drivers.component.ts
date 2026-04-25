import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DriverService } from '../../../core/services/driver.service';
import { Driver, DriverStatus, DeliveryVehicleType, CreateDriverRequest } from '../../../core/models/driver.model';

@Component({
  selector: 'app-drivers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './drivers.component.html',
  styleUrls: ['./drivers.component.css']
})
export class DriversComponent implements OnInit {
  private driverService = inject(DriverService);

  drivers: Driver[] = [];
  isLoading = true;

  // Modals state
  showCreateModal = false;
  showStatusModal = false;
  selectedDriver: Driver | null = null;

  // Create form state
  newDriver: CreateDriverRequest = {
    firstName: '',
    lastName: '',
    vehicleType: DeliveryVehicleType.Motorcycle,
    city: '',
    state: '',
    street: '',
    buildingNumber: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    nationalId: ''
  };

  // Status form state
  newStatus: DriverStatus = DriverStatus.Available;

  DriverStatusEnum = DriverStatus;
  VehicleTypeEnum = DeliveryVehicleType;

  ngOnInit() {
    this.loadDrivers();
  }

  loadDrivers() {
    this.isLoading = true;
    this.driverService.getAllDrivers().subscribe({
      next: (data) => {
        this.drivers = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load drivers', err);
        this.isLoading = false;
      }
    });
  }

  openCreateModal() {
    this.showCreateModal = true;
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  createDriver() {
    this.driverService.createDriver(this.newDriver).subscribe({
      next: () => {
        this.closeCreateModal();
        this.loadDrivers(); // Reload the list
      },
      error: (err) => {
        console.error('Failed to create driver', err);
        alert('Failed to create driver. Check console for details.');
      }
    });
  }

  openStatusModal(driver: Driver) {
    this.selectedDriver = driver;
    this.newStatus = driver.status;
    this.showStatusModal = true;
  }

  closeStatusModal() {
    this.showStatusModal = false;
    this.selectedDriver = null;
  }

  updateDriverStatus() {
    if (!this.selectedDriver) return;
    
    this.driverService.changeDriverStatus(this.selectedDriver.id, {
      driverId: this.selectedDriver.id,
      newStatus: this.newStatus
    }).subscribe({
      next: () => {
        this.closeStatusModal();
        this.loadDrivers();
      },
      error: (err) => {
        console.error('Failed to update status', err);
        alert('Failed to update status.');
      }
    });
  }

  getStatusBadgeClass(status: DriverStatus): string {
    switch(status) {
      case DriverStatus.Available: return 'badge-success';
      case DriverStatus.Busy: return 'badge-warning';
      case DriverStatus.Offline: return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  getVehicleIcon(type: DeliveryVehicleType): string {
    switch(type) {
      case DeliveryVehicleType.Bicycle: return 'fa-bicycle';
      case DeliveryVehicleType.Motorcycle: return 'fa-motorcycle';
      case DeliveryVehicleType.Car: return 'fa-car';
      case DeliveryVehicleType.Van: return 'fa-truck-pickup';
      case DeliveryVehicleType.Truck: return 'fa-truck';
      default: return 'fa-truck';
    }
  }
}
