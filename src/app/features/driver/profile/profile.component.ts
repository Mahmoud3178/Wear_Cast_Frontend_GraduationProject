import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DriverService } from '../../../core/services/driver.service';
import { DriverProfile, UpdateDriverRequest, DriverStatus, DeliveryVehicleType } from '../../../core/models/driver.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-driver-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class DriverProfileComponent implements OnInit {
  private driverService = inject(DriverService);
  private authService = inject(AuthService);

  profile: DriverProfile | null = null;
  isLoading = true;
  isEditing = false;

  DriverStatusEnum = DriverStatus;
  VehicleTypeEnum = DeliveryVehicleType;

  editForm: UpdateDriverRequest = {
    firstName: '',
    lastName: '',
    vehicleType: DeliveryVehicleType.Motorcycle,
    phoneNumber: '',
    nationalId: '',
    address: { state: '', city: '', street: '', buildingNumber: '' }
  };

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.isLoading = true;
    const userId = this.authService.getCurrentUserId();
    // Assuming driver id is the same or we have an endpoint to get "my profile".
    // For now, let's use the ID from token or a placeholder.
    const driverId = userId ? parseInt(userId, 10) : 1; 

    this.driverService.getDriverById(driverId).subscribe({
      next: (data) => {
        // Map Driver to DriverProfile temporarily or if backend returns full details
        this.profile = data as any as DriverProfile;
        const names = this.profile.driverName ? this.profile.driverName.split(' ') : [''];
        this.editForm = {
          providedDriverId: this.profile.id,
          firstName: names[0] || '',
          lastName: names.slice(1).join(' ') || '',
          vehicleType: this.profile.vehicleType,
          phoneNumber: this.profile.phoneNumber || '',
          nationalId: this.profile.nationalId || '',
          address: {
            state: '',
            city: this.profile.driverCity || '',
            street: '',
            buildingNumber: ''
          }
        };
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load driver profile', err);
        this.isLoading = false;
      }
    });
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing && this.profile) {
      const names = this.profile.driverName ? this.profile.driverName.split(' ') : [''];
      this.editForm = {
        providedDriverId: this.profile.id,
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        vehicleType: this.profile.vehicleType,
        phoneNumber: this.profile.phoneNumber || '',
        nationalId: this.profile.nationalId || '',
        address: {
          state: '',
          city: this.profile.driverCity || '',
          street: '',
          buildingNumber: ''
        }
      };
    }
  }

  saveProfile() {
    this.driverService.updateDriver(this.editForm).subscribe({
      next: () => {
        this.isEditing = false;
        this.loadProfile();
      },
      error: (err) => {
        console.error('Failed to update driver profile', err);
        alert('Failed to update driver profile.');
      }
    });
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      this.driverService.updateProfileImage(formData).subscribe({
        next: () => {
          this.loadProfile();
        },
        error: (err) => {
          console.error('Failed to upload image', err);
          alert('Failed to upload image.');
        }
      });
    }
  }
}
