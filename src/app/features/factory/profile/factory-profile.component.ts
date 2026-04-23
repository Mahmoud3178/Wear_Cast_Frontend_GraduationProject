import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FactoryApiService, FactoryProfile, FactoryManager } from '../../../core/services/factory-api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-factory-profile',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule],
  templateUrl: './factory-profile.component.html'
})
export class FactoryProfileComponent implements OnInit {
  profile: FactoryProfile | null = null;
  managers: FactoryManager[] = [];
  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';

  // Edit form
  isEditing = false;
  editForm = {
    name: '',
    description: '',
    taxIdNumber: '',
    commercialRegisterNumber: '',
    address: {
      country: '',
      state: '',
      city: '',
      street: '',
      buildingNumber: ''
    },
    phoneNumber: '',
    email: ''
  };

  constructor(
    private readonly factoryApi: FactoryApiService,
    private readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
    this.loadManagers();
  }

  loadProfile(): void {
    this.loading = true;
    this.errorMsg = '';
    this.factoryApi.getFactoryProfile().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.editForm = {
          name: profile.name || '',
          description: profile.description || '',
          taxIdNumber: profile.taxIdNumber || '',
          commercialRegisterNumber: profile.commercialRegisterNumber || '',
          address: {
            country: profile.address?.country || '',
            state: profile.address?.state || '',
            city: profile.address?.city || '',
            street: profile.address?.street || '',
            buildingNumber: profile.address?.buildingNumber || ''
          },
          phoneNumber: profile.phoneNumber || '',
          email: profile.email || ''
        };
        this.loading = false;
      },
      error: (err: Error) => {
        this.errorMsg = err.message || 'Failed to load factory profile.';
        this.loading = false;
      }
    });
  }

  loadManagers(): void {
    this.factoryApi.getFactoryManagers().subscribe({
      next: (managers) => {
        this.managers = managers;
      },
      error: () => {
        // Silent fail - managers not critical
      }
    });
  }

  startEdit(): void {
    this.isEditing = true;
    this.successMsg = '';
    this.errorMsg = '';
  }

  cancelEdit(): void {
    this.isEditing = false;
    if (this.profile) {
      this.editForm = {
        name: this.profile.name || '',
        description: this.profile.description || '',
        taxIdNumber: this.profile.taxIdNumber || '',
        commercialRegisterNumber: this.profile.commercialRegisterNumber || '',
        address: {
          country: this.profile.address?.country || '',
          state: this.profile.address?.state || '',
          city: this.profile.address?.city || '',
          street: this.profile.address?.street || '',
          buildingNumber: this.profile.address?.buildingNumber || ''
        },
        phoneNumber: this.profile.phoneNumber || '',
        email: this.profile.email || ''
      };
    }
  }

  saveProfile(): void {
    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';

    this.factoryApi.updateFactoryProfile({
      name: this.editForm.name.trim(),
      description: this.editForm.description.trim(),
      taxIdNumber: this.editForm.taxIdNumber.trim(),
      commercialRegisterNumber: this.editForm.commercialRegisterNumber.trim(),
      address: {
        country: this.editForm.address.country.trim(),
        state: this.editForm.address.state.trim(),
        city: this.editForm.address.city.trim(),
        street: this.editForm.address.street.trim(),
        buildingNumber: this.editForm.address.buildingNumber.trim()
      },
      phoneNumber: this.editForm.phoneNumber.trim(),
      email: this.editForm.email.trim()
    }).subscribe({
      next: () => {
        this.saving = false;
        this.isEditing = false;
        this.successMsg = 'Profile updated successfully!';
        this.loadProfile();
      },
      error: (err: Error) => {
        this.saving = false;
        this.errorMsg = err.message || 'Failed to update profile.';
      }
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.factoryApi.updateFactoryProfileImage(file).subscribe({
      next: () => {
        this.successMsg = 'Profile image updated successfully!';
        this.loadProfile();
      },
      error: (err: Error) => {
        this.errorMsg = err.message || 'Failed to update profile image.';
      }
    });
  }
}
