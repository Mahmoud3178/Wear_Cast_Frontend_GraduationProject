import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, map } from 'rxjs';
import { DriverService } from '../../../core/services/driver.service';
import { ShippingService } from '../../../core/services/shipping.service';
import { Driver, DriverStatus, DeliveryVehicleType, CreateDriverRequest, UpdateDriverRequest } from '../../../core/models/driver.model';
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
  private shippingService = inject(ShippingService);
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
  searchFirstName = '';
  searchLastName = '';
  searchCity = '';
  searchNationalId = '';
  searchVehicleType = '';
  sortBy = 'Newest';
  pageIndex = 1;
  pageSize = 10;
  totalPages = 2;
  totalCount = 0;

  sortOptions = [
    { value: 'Newest', label: 'Newest' },
    { value: 'NumberOfAssignedShipmentsAsc', label: 'Assigned Shipments (Asc)' },
    { value: 'NumberOfAssignedShipmentsDesc', label: 'Assigned Shipments (Desc)' },
    { value: 'NumberOfDeliveredShipmentsAsc', label: 'Delivered Shipments (Asc)' },
    { value: 'NumberOfDeliveredShipmentsDesc', label: 'Delivered Shipments (Desc)' },
    { value: 'NumberOfActiveShipmentsAsc', label: 'Active Shipments (Asc)' },
    { value: 'NumberOfActiveShipmentsDesc', label: 'Active Shipments (Desc)' }
  ];
  previewImage: string | null = null;
  selectedFile: File | null = null;
  isEditMode = false;
  backendErrors: any = null;

  isRegisterModalOpen = false;
  isUpdateModalOpen = false;
  selectedDriver: Driver | null = null;
  showPasswordState = false;
  showConfirmPasswordState = false;

  togglePasswordVisibility() {
    this.showPasswordState = !this.showPasswordState;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPasswordState = !this.showConfirmPasswordState;
  }

  // Details Modal
  showDetailsModal = false;
  isLoadingDetails = false;
  selectedDriverDetails: any = null;
  driverShipments: any[] = [];

  // Form
  newDriver: any = {
    firstName: '',
    lastName: '',
    phoneNumber: '',
    nationalId: '',
    vehicleType: DeliveryVehicleType.Motorcycle,
    vehiclePlateNumber: '',
    email: '',
    state: '',
    city: '',
    street: '',
    buildingNumber: '',
    password: '',
    confirmPassword: '',
    status: DriverStatus.Available
  };

  DriverStatus = DriverStatus;
  DeliveryVehicleType = DeliveryVehicleType;

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.loadDrivers();
    // this.loadStats(); // Disabled because endpoint /api/Shipments/stats does not exist
  }

  loadStats() {
    this.driverService.getShippingStats().subscribe({
      next: (data) => console.log('Stats data:', data),
      error: (err) => {
        console.error('Stats error details:', err);
        if (err.error) {
          console.error('Stats error body:', err.error);
        }
      }
    });
  }

  loadDrivers() {
    this.loading = true;
    const params: any = {
      PageIndex: this.pageIndex,
      PageSize: this.pageSize,
      SortBy: this.sortBy
    };

    if (this.searchFirstName.trim()) params.DriverFirstName = this.searchFirstName.trim();
    if (this.searchLastName.trim()) params.DriverLastName = this.searchLastName.trim();
    if (this.searchCity.trim()) params.DriverCity = this.searchCity.trim();
    if (this.searchNationalId.trim()) params.DriverNationalId = this.searchNationalId.trim();

    if (this.searchVehicleType) {
      params.VehicleType = Number(this.searchVehicleType);
    }

    if (this.selectedFilter !== 'all') {
      params.DriverStatus = this.selectedFilter === 'Available' ? DriverStatus.Available : DriverStatus.NotAvailable;
    }

    this.driverService.getAllDrivers(params).subscribe({
      next: (response) => {
        console.log('GetAllDrivers response:', response);
        const data = response.items || [];
        this.totalPages = response.pages || 1;
        this.totalCount = response.records || 0;
        this.pageIndex = response.pageIndex || 1;

        if (data.length === 0) {
          this.drivers = [];
          this.loading = false;
          this.applyFilters();
          return;
        }

        const requests = data.map((d: any) => this.driverService.getDriverById(d.id));
        forkJoin(requests).subscribe({
          next: (profiles: any) => {
            this.drivers = data.map((d: any, index: number) => {
              const profile = profiles[index];
              return {
                ...d,
                driverPhone: profile.phoneNumber,
                driverEmail: profile.email,
                driverNationalId: profile.nationalId,
                vehiclePlateNumber: profile.vehiclePlateNumber,
                profileImageUrl: profile.profileImageUrl
              };
            });

            this.stats.total = this.totalCount; // Use totalCount from backend
            this.stats.active = this.drivers.filter(d => d.status === DriverStatus.Available).length; // This is only for the current page though
            this.stats.onTrip = this.drivers.filter(d => d.numberOfActiveShipments > 0).length;

            const totalRating = this.drivers.reduce((acc, d) => acc + this.getDriverRating(d), 0);
            this.stats.avgRating = this.drivers.length > 0 ? (totalRating / this.drivers.length).toFixed(1) : '4.8';

            this.applyFilters();
            this.loading = false;
          },
          error: (err) => {
            console.error('Profiles load error', err);
            this.drivers = data; // fallback
            this.applyFilters();
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('Drivers load error', err);
        this.loading = false;
      }
    });
  }

  nextPage() {
    if (this.pageIndex < this.totalPages) {
      this.pageIndex++;
      this.loadDrivers();
    }
  }

  previousPage() {
    if (this.pageIndex > 1) {
      this.pageIndex--;
      this.loadDrivers();
    }
  }

  getDriverRating(driver: Driver): number {
    return driver.numberOfDeliveredShipments > 5 ? 5.0 : 4.5;
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
      const statusNum = this.selectedFilter === 'NotAvailable' ? DriverStatus.Available : DriverStatus.NotAvailable;
      result = result.filter(d => d.status === statusNum);
    }

    this.filteredDrivers = result;
  }

  openRegisterModal() {
    this.isEditMode = false;
    this.isRegisterModalOpen = true;
    this.backendErrors = null;
    this.showPasswordState = false;
    this.showConfirmPasswordState = false;
    this.resetNewDriver();
  }

  openEditModal(driver: Driver) {
    this.isEditMode = true;
    this.selectedDriver = driver;
    this.showPasswordState = false;
    this.showConfirmPasswordState = false;
    this.driverService.getDriverById(driver.id).subscribe({
      next: (profile: any) => {
        this.newDriver = {
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          phoneNumber: profile.phoneNumber || '',
          nationalId: profile.nationalId || '',
          vehicleType: this.getNumericStatus(profile.vehicleType, DeliveryVehicleType),
          vehiclePlateNumber: profile.vehiclePlateNumber || '',
          email: profile.email || '',
          state: profile.address?.state || '',
          city: profile.address?.city || '',
          street: profile.address?.street || '',
          buildingNumber: profile.address?.buildingNumber || '',
          password: '',
          confirmPassword: '',
          status: this.getNumericStatus(profile.status, DriverStatus)
        };
        this.previewImage = profile.profileImageUrl || null;
        this.isRegisterModalOpen = true;
      },
      error: (err) => console.error('Fetch profile error', err)
    });
  }

  onUpdateDriver() {
    if (!this.selectedDriver) return;

    this.isSubmitting = true;
    const request: UpdateDriverRequest = {
      firstName: this.newDriver.firstName || 'New',
      lastName: this.newDriver.lastName || 'Driver',
      phoneNumber: this.newDriver.phoneNumber,
      nationalId: this.newDriver.nationalId,
      vehicleType: Number(this.newDriver.vehicleType),
      vehiclePlateNumber: this.newDriver.vehiclePlateNumber,
      address: {
        state: this.newDriver.state || 'Cairo',
        city: this.newDriver.city || 'Cairo',
        street: this.newDriver.street || 'Main St',
        buildingNumber: this.newDriver.buildingNumber || '1'
      },
      providedDriverId: this.selectedDriver.id
    };

    this.driverService.updateDriver(request).subscribe({
      next: () => {
        if (this.selectedDriver && this.newDriver.status !== this.selectedDriver.status) {
          this.driverService.changeDriverStatus(this.selectedDriver.id, {
            driverId: this.selectedDriver.id,
            newStatus: this.newDriver.status
          }).subscribe({
            next: () => {
              this.isSubmitting = false;
              this.closeRegisterModal();
              this.loadInitialData();
            },
            error: (err: any) => {
              this.isSubmitting = false;
              console.error('Update status error', err);
              alert('Profile updated, but failed to update status.');
              this.closeRegisterModal();
              this.loadInitialData();
            }
          });
        } else {
          this.isSubmitting = false;
          this.closeRegisterModal();
          this.loadInitialData();
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Update error', err);
        if (err.error && err.error.validationErrors) {
          this.backendErrors = err.error.validationErrors;
        } else if (err.error && err.error.error && err.error.error.description) {
          this.backendErrors = { "Error": err.error.error.description };
        } else {
          alert('Failed to update driver.');
        }
      }
    });
  }

  closeRegisterModal() {
    this.isRegisterModalOpen = false;
    this.previewImage = null;
    this.resetNewDriver();
    this.backendErrors = null;
  }

  resetNewDriver() {
    this.newDriver = {
      firstName: '',
      lastName: '',
      phoneNumber: '',
      nationalId: '',
      vehicleType: DeliveryVehicleType.Motorcycle,
      vehiclePlateNumber: '',
      email: '',
      state: '',
      city: '',
      street: '',
      buildingNumber: '',
      password: '',
      confirmPassword: '',
      status: DriverStatus.Available
    };
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e) => this.previewImage = e.target?.result as string;
      reader.readAsDataURL(file);
    }
  }

  onRegisterDriver() {
    if (!this.selectedFile) {
      alert('Profile image is required by the backend!');
      return;
    }

    this.isSubmitting = true;
    const request: CreateDriverRequest = {
      firstName: this.newDriver.firstName || 'New',
      lastName: this.newDriver.lastName || 'Driver',
      email: this.newDriver.email || `${this.newDriver.phoneNumber}@wearcast.com`,
      phoneNumber: this.newDriver.phoneNumber,
      nationalId: this.newDriver.nationalId,
      vehicleType: Number(this.newDriver.vehicleType),
      vehiclePlateNumber: this.newDriver.vehiclePlateNumber || 'ABC-123',
      state: this.newDriver.state || 'Cairo',
      city: this.newDriver.city || 'Cairo',
      street: this.newDriver.street || 'Main St',
      buildingNumber: this.newDriver.buildingNumber || '1',
      password: this.newDriver.password || 'WearCast@2024',
      confirmPassword: this.newDriver.confirmPassword || 'WearCast@2024',
      profileImage: this.selectedFile
    };

    this.driverService.createDriver(request).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeRegisterModal();
        this.loadInitialData();
      },
      error: (err: any) => {
        this.isSubmitting = false;
        console.error('Create error', err);
        if (err.error && err.error.validationErrors) {
          this.backendErrors = err.error.validationErrors;
        } else if (err.error && err.error.error && err.error.error.description) {
          this.backendErrors = { "Error": err.error.error.description };
        } else {
          alert('Failed to register driver.');
        }
      }
    });
  }

  openDetailsModal(driver: Driver) {
    this.showDetailsModal = true;
    this.isLoadingDetails = true;
    this.selectedDriverDetails = null;
    this.driverShipments = [];

    forkJoin({
      profile: this.driverService.getDriverById(driver.id),
      shipmentsData: this.driverService.getAllDriverShipments(driver.id)
    }).subscribe({
      next: ({ profile, shipmentsData }) => {
        this.selectedDriverDetails = profile;

        const shipmentsList = shipmentsData?.items || (shipmentsData as any) || [];

        if (Array.isArray(shipmentsList) && shipmentsList.length > 0) {
          const orderRequests = shipmentsList.map((s: any) =>
            this.shippingService.getOrdersByShipmentId(s.id).pipe(
              map(ordersData => ({
                ...s,
                orders: ordersData?.orders || []
              }))
            )
          );
          forkJoin(orderRequests).subscribe({
            next: (detailedShipments) => {
              this.driverShipments = detailedShipments as any[];
              this.isLoadingDetails = false;
            },
            error: (err) => {
              console.error('Failed to load shipment orders', err);
              this.driverShipments = shipmentsList.map((s: any) => ({ ...s, orders: [] }));
              this.isLoadingDetails = false;
            }
          });
        } else {
          this.driverShipments = [];
          this.isLoadingDetails = false;
        }
      },
      error: (err) => {
        console.error('Failed to load driver details', err);
        this.isLoadingDetails = false;
      }
    });
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedDriverDetails = null;
    this.driverShipments = [];
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
      error: (err: any) => {
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
        error: (err: any) => {
          console.error('Delete error', err);
          alert('Failed to delete driver.');
        }
      });
    }
  }

  getStatusText(status: DriverStatus): string {
    return status === DriverStatus.Available ? 'Available' : 'NotAvailable';
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  // --- Helper methods for unified UI ---

  getStatusName(status: any): string {
    const s = this.getNumericStatus(status, DriverStatus);
    switch (s) {
      case DriverStatus.Available: return 'Available';
      case DriverStatus.NotAvailable: return 'Not Available';
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
