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
    address: '',
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
          address: profile.address || '',
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
        address: this.profile.address || '',
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
      address: this.editForm.address.trim(),
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
