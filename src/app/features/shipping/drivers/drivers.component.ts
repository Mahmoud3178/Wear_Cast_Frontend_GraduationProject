import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DriverService } from '../../../core/services/driver.service';
import { Driver, DriverStatus, DeliveryVehicleType, CreateDriverRequest } from '../../../core/models/driver.model';
import { ShippingStats } from '../../../core/models/shipping-stats.model';

@Component({
  selector: 'app-drivers',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './drivers.component.html',
  styleUrls: ['./drivers.component.css']
})
export class DriversComponent implements OnInit {
  private driverService = inject(DriverService);
  private fb = inject(FormBuilder);

  drivers: Driver[] = [];
  filteredDrivers: Driver[] = [];
  stats: any = {
    total: 0,
    active: 0,
    onTrip: 0,
    avgRating: 4.8
  };
  
  loading = true;
  isSubmitting = false;
  searchQuery = '';
  selectedFilter = 'all';
  previewImage: string | null = null;

  // Modals
  isRegisterModalOpen = false;
  isUpdateModalOpen = false;
  selectedDriver: Driver | null = null;

  // Form
  newDriver: any = {
    name: '',
    phoneNumber: '',
    nationalId: '',
    vehicleType: DeliveryVehicleType.Motorcycle,
    vehiclePlateNumber: '',
    email: '',
    state: '',
    city: '',
    street: '',
    buildingNumber: ''
  };

  DriverStatus = DriverStatus;
  DeliveryVehicleType = DeliveryVehicleType;

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.loadDrivers();
    this.loadStats();
  }

  loadStats() {
    this.driverService.getShippingStats().subscribe({
      next: (data) => {
        if (data) {
          // Since data is ShippingStats, it has activeDrivers but not totalDrivers
          this.stats.active = data.activeDrivers || 0;
          // We'll update stats.total in loadDrivers()
          this.stats.onTrip = Math.floor(this.stats.active * 0.7); 
        }
      },
      error: (err) => console.error('Stats error', err)
    });
  }

  loadDrivers() {
    this.loading = true;
    this.driverService.getAllDrivers().subscribe({
      next: (data) => {
        this.drivers = data;
        this.stats.total = this.drivers.length;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Drivers load error', err);
        this.loading = false;
      }
    });
  }

  onSearchChange() {
    this.applyFilters();
  }

  onFilterChange(event: any) {
    this.selectedFilter = event.target.value;
    this.applyFilters();
  }

  onStatusFilterChange(status: string) {
    this.selectedFilter = status;
    this.applyFilters();
  }

  applyFilters() {
    let result = [...this.drivers];

    // Search filter
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(d => 
        d.driverName.toLowerCase().includes(q) || 
        d.driverCity.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (this.selectedFilter !== 'all') {
      const statusNum = this.selectedFilter === 'online' ? DriverStatus.Available : DriverStatus.NotAvailable;
      result = result.filter(d => d.status === statusNum);
    }

    this.filteredDrivers = result;
  }

  openRegisterModal() {
    this.isRegisterModalOpen = true;
  }

  closeRegisterModal() {
    this.isRegisterModalOpen = false;
    this.previewImage = null;
    this.resetNewDriver();
  }

  resetNewDriver() {
    this.newDriver = {
      name: '',
      phoneNumber: '',
      nationalId: '',
      vehicleType: DeliveryVehicleType.Motorcycle,
      vehiclePlateNumber: '',
      email: '',
      state: '',
      city: '',
      street: '',
      buildingNumber: ''
    };
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => this.previewImage = e.target?.result as string;
      reader.readAsDataURL(file);
    }
  }

  onRegisterDriver() {
    this.isSubmitting = true;
    // Map UI model to API model
    const names = this.newDriver.name.split(' ');
    const request: CreateDriverRequest = {
      firstName: names[0] || 'New',
      lastName: names.slice(1).join(' ') || 'Driver',
      email: this.newDriver.email || `${this.newDriver.phoneNumber}@wearcast.com`,
      phoneNumber: this.newDriver.phoneNumber,
      nationalId: this.newDriver.nationalId,
      vehicleType: this.newDriver.vehicleType,
      vehiclePlateNumber: this.newDriver.vehiclePlateNumber || 'ABC-123',
      state: this.newDriver.state || 'Cairo',
      city: this.newDriver.city || 'Cairo',
      street: this.newDriver.street || 'Main St',
      buildingNumber: this.newDriver.buildingNumber || '1',
      password: 'WearCast@2024',
      confirmPassword: 'WearCast@2024'
    };

    this.driverService.createDriver(request).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeRegisterModal();
        this.loadInitialData();
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Create error', err);
        alert('Failed to register driver.');
      }
    });
  }

  openUpdateModal(driver: Driver) {
    this.selectedDriver = { ...driver };
    this.isUpdateModalOpen = true;
  }

  closeUpdateModal() {
    this.isUpdateModalOpen = false;
    this.selectedDriver = null;
  }

  onUpdateStatus() {
    if (!this.selectedDriver) return;
    
    this.isSubmitting = true;
    this.driverService.changeDriverStatus(this.selectedDriver.id, {
      driverId: this.selectedDriver.id,
      newStatus: this.selectedDriver.status
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeUpdateModal();
        this.loadInitialData();
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Update status error', err);
        const errorMsg = err.error?.detail || err.error?.message || 'Failed to update status.';
        alert(errorMsg);
      }
    });
  }

  confirmDelete(driver: Driver) {
    if (confirm(`Are you sure you want to remove ${driver.driverName}?`)) {
      this.driverService.deleteDriver(driver.id).subscribe({
        next: () => this.loadInitialData(),
        error: (err) => {
          console.error('Delete error', err);
          alert('Failed to delete driver.');
        }
      });
    }
  }

  getStatusText(status: DriverStatus): string {
    return status === DriverStatus.Available ? 'online' : 'offline';
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  // --- Helper methods for unified UI ---

  getStatusName(status: any): string {
    const s = this.getNumericStatus(status, DriverStatus);
    switch (s) {
      case DriverStatus.Available: return 'Available';
      case DriverStatus.NotAvailable: return 'Busy / Offline';
      default: return 'Unknown';
    }
  }

  getVehicleTypeName(type: any): string {
    const t = this.getNumericStatus(type, DeliveryVehicleType);
    switch (t) {
      case DeliveryVehicleType.Bicycle: return 'Bicycle';
      case DeliveryVehicleType.Motorcycle: return 'Motorcycle';
      case DeliveryVehicleType.Car: return 'Car';
      case DeliveryVehicleType.Van: return 'Van';
      default: return 'Vehicle';
    }
  }

  getStatusBadgeClass(status: any): string {
    const s = this.getNumericStatus(status, DriverStatus);
    switch (s) {
      case DriverStatus.Available: return 'status-delivered'; // Green
      case DriverStatus.NotAvailable: return 'status-unassigned'; // Grey
      default: return 'status-unknown';
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
}
