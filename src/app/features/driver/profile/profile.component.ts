import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { DriverService } from '../../../core/services/driver.service';
import { DeliveryVehicleType, UpdateDriverRequest } from '../../../core/models/driver.model';

@Component({
  selector: 'app-driver-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private driverService = inject(DriverService);

  isLoading = false;
  isEditing = false;
  errorMessage = '';
  successMessage = '';

  driver: any = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    nationalId: '',
    vehicleType: DeliveryVehicleType.Car,
    vehiclePlateNumber: '',
    address: {
      state: '',
      city: '',
      street: '',
      buildingNumber: ''
    }
  };

  driverForm: any = { ...this.driver, address: { ...this.driver.address } };

  vehicleTypes = [
    { value: DeliveryVehicleType.Bicycle, label: 'Bicycle' },
    { value: DeliveryVehicleType.Motorcycle, label: 'Motorcycle' },
    { value: DeliveryVehicleType.Car, label: 'Car' },
    { value: DeliveryVehicleType.Van, label: 'Van' }
  ];

  ngOnInit(): void {
    this.loadDriverProfile();
  }

  loadDriverProfile() {
    const driverId = this.authService.getDriverId();
    if (!driverId) {
      this.errorMessage = 'No Driver ID found in token.';
      return;
    }

    this.isLoading = true;
    this.driverService.getDriverById(driverId).subscribe({
      next: (profile: any) => {
        let vehicleType = profile.vehicleType;
        if (typeof vehicleType === 'string') {
          const mapped = DeliveryVehicleType[vehicleType as keyof typeof DeliveryVehicleType];
          if (mapped !== undefined) {
            vehicleType = mapped;
          }
        }

        this.driver = {
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phoneNumber: profile.phoneNumber,
          nationalId: profile.nationalId,
          vehicleType: vehicleType,
          vehiclePlateNumber: profile.vehiclePlateNumber,
          address: profile.address || { state: '', city: '', street: '', buildingNumber: '' }
        };
        this.driverForm = { ...this.driver, address: { ...this.driver.address } };
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load driver profile', err);
        this.errorMessage = 'Failed to load profile data.';
        this.isLoading = false;
      }
    });
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.driverForm = { ...this.driver, address: { ...this.driver.address } };
    }
  }

  saveProfile() {
    const driverId = this.authService.getDriverId();
    if (!driverId) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request: UpdateDriverRequest = {
      firstName: this.driverForm.firstName,
      lastName: this.driverForm.lastName,
      phoneNumber: this.driverForm.phoneNumber,
      nationalId: this.driverForm.nationalId,
      vehicleType: this.driverForm.vehicleType,
      vehiclePlateNumber: this.driverForm.vehiclePlateNumber,
      address: {
        state: this.driverForm.address.state,
        city: this.driverForm.address.city,
        street: this.driverForm.address.street,
        buildingNumber: this.driverForm.address.buildingNumber
      }
    };

    this.driverService.updateDriver(request).subscribe({
      next: () => {
        this.driver = { ...this.driverForm, address: { ...this.driverForm.address } };
        this.isEditing = false;
        this.isLoading = false;
        this.successMessage = 'Profile updated successfully!';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        console.error('Failed to update driver profile', err);
        this.errorMessage = 'Failed to update profile.';
        this.isLoading = false;
      }
    });
  }

  getVehicleTypeName(type: any): string {
    if (typeof type === 'string') {
      return type;
    }
    switch (type) {
      case DeliveryVehicleType.Bicycle: return 'Bicycle';
      case DeliveryVehicleType.Motorcycle: return 'Motorcycle';
      case DeliveryVehicleType.Car: return 'Car';
      case DeliveryVehicleType.Van: return 'Van';
      default: return 'Unknown';
    }
  }
}
