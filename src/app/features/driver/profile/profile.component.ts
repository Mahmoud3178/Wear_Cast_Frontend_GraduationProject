import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { DriverService } from '../../../core/services/driver.service';
import { DeliveryVehicleType, UpdateDriverRequest, DriverStatus } from '../../../core/models/driver.model';

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
  passwordData = {
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  };
  isChangingPassword = false;
  isPasswordModalOpen = false;

  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  passwordErrorMessage = '';
  passwordSuccessMessage = '';

  openPasswordModal() {
    this.isPasswordModalOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.passwordErrorMessage = '';
    this.passwordSuccessMessage = '';
    this.passwordData = { currentPassword: '', newPassword: '', confirmNewPassword: '' };
  }

  closePasswordModal() {
    this.isPasswordModalOpen = false;
  }

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
    },
    status: DriverStatus.Available
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
        
        let statusValue = DriverStatus.Available;
        if (profile.status === 'Available' || profile.status === 1) {
          statusValue = DriverStatus.Available;
        } else if (profile.status === 'NotAvailable' || profile.status === 2 || profile.status === 'Not Available') {
          statusValue = DriverStatus.NotAvailable;
        }

        this.driver = {
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phoneNumber: profile.phoneNumber,
          nationalId: profile.nationalId,
          vehicleType: vehicleType,
          vehiclePlateNumber: profile.vehiclePlateNumber,
          address: profile.address || { state: '', city: '', street: '', buildingNumber: '' },
          status: statusValue
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

  toggleStatus(event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    const newStatus = isChecked ? DriverStatus.Available : DriverStatus.NotAvailable;

    const driverId = this.authService.getDriverId();
    if (!driverId) return;

    this.isLoading = true;
    this.driverService.changeDriverStatus(driverId, { driverId, newStatus }).subscribe({
      next: () => {
        this.driver.status = newStatus;
        this.isLoading = false;
        this.successMessage = `Status updated to ${newStatus === DriverStatus.Available ? 'Available' : 'Not Available'}`;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        console.error('Failed to change status', err);
        // Revert the toggle visually by forcing change detection to pick up original status
        (event.target as HTMLInputElement).checked = !isChecked;
        
        let msg = 'Failed to update status.';
        if (err?.error?.description) {
          msg = err.error.description;
        } else if (err?.error?.message) {
          msg = err.error.message;
        } else if (err?.error?.error?.message) {
          msg = err.error.error.message;
        }
        
        this.errorMessage = msg;
        this.isLoading = false;
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }

  changePassword(passwordForm: any) {
    if (this.passwordData.newPassword !== this.passwordData.confirmNewPassword) {
      this.passwordErrorMessage = 'New passwords do not match.';
      setTimeout(() => this.passwordErrorMessage = '', 5000);
      return;
    }

    this.isChangingPassword = true;
    this.passwordErrorMessage = '';
    this.authService.changePassword(this.passwordData).subscribe({
      next: () => {
        this.isChangingPassword = false;
        this.passwordSuccessMessage = 'Password changed successfully!';
        setTimeout(() => this.passwordSuccessMessage = '', 4000);
        this.passwordData = { currentPassword: '', newPassword: '', confirmNewPassword: '' };
        if (passwordForm) {
          passwordForm.resetForm();
        }
        setTimeout(() => this.closePasswordModal(), 1500);
      },
      error: (err) => {
        console.error('Failed to change password', err);
        let msg = 'Failed to change password.';
        if (err?.error?.description) msg = err.error.description;
        else if (err?.error?.message) msg = err.error.message;
        else if (err?.error?.error?.message) msg = err.error.error.message;
        
        this.passwordErrorMessage = msg;
        this.isChangingPassword = false;
        setTimeout(() => this.passwordErrorMessage = '', 5000);
      }
    });
  }
}
