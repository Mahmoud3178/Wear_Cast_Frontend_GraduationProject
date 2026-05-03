import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor, NgClass, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FactoryApiService,
  FactoryProfile,
  FactoryManager,
  FactoryManagerProfile,
  FactoryWalletSummary
} from '../../../core/services/factory-api.service';

@Component({
  selector: 'app-factory-profile',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, FormsModule, DecimalPipe, DatePipe],
  templateUrl: './factory-profile.component.html'
})
export class FactoryProfileComponent implements OnInit {
  profile: FactoryProfile | null = null;
  managerProfile: FactoryManagerProfile | null = null;
  managers: FactoryManager[] = [];
  wallet: FactoryWalletSummary | null = null;
  walletLoading = false;
  walletError = '';
  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';

  // Edit form
  isEditing = false;
  editingType: 'factory' | 'manager' | null = null;
  factoryEditForm = {
    name: '',
    email: '',
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
    phoneNumber: ''
  };
  managerEditForm = {
    firstName: '',
    lastName: '',
    phoneNumber: ''
  };

  constructor(
    private readonly factoryApi: FactoryApiService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
    this.loadWallet();
  }

  loadProfile(): void {
    this.loading = true;
    this.errorMsg = '';
    let pending = 2;
    const finishOne = () => {
      pending -= 1;
      if (pending <= 0) {
        this.loading = false;
      }
    };
    const handleFactorySuccess = (fp: FactoryProfile) => {
      this.profile = fp;
      this.loadManagers();
      finishOne();
    };
    const handleManagerSuccess = (mp: FactoryManagerProfile) => {
      this.managerProfile = mp;
      const firstName = (mp.firstName || '').trim();
      const lastName = (mp.lastName || '').trim();
      this.managerEditForm = { firstName, lastName, phoneNumber: mp.phoneNumber || '' };
      finishOne();
    };
    const handleError = (err: Error) => {
      this.errorMsg = err.message || 'Failed to load factory profile.';
      finishOne();
    };
    this.factoryApi.getFactoryManagerProfile().subscribe({
      next: profile => handleManagerSuccess(profile),
      error: () => {
        // Keep page usable even when manager profile endpoint is unavailable.
        this.managerProfile = this.managerProfile ?? {
          firstName: '',
          lastName: '',
          name: '',
          email: '',
          phoneNumber: ''
        };
        finishOne();
      }
    });
    this.factoryApi.getFactoryProfile().subscribe({
      next: profile => handleFactorySuccess(profile),
      error: handleError
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

  loadWallet(): void {
    this.walletLoading = true;
    this.walletError = '';
    this.factoryApi.getFactoryWallet().subscribe({
      next: wallet => {
        this.wallet = wallet;
        this.walletLoading = false;
      },
      error: (err: Error) => {
        this.walletLoading = false;
        this.walletError = err.message || 'Failed to load wallet.';
      }
    });
  }

  startEdit(): void {
    this.startEditFactory();
  }

  startEditFactory(): void {
    if (!this.profile) return;
    this.isEditing = true;
    this.editingType = 'factory';
    this.successMsg = '';
    this.errorMsg = '';
    this.factoryEditForm = {
      name: this.profile.name || '',
      email: this.profile.email || '',
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
      phoneNumber: this.profile.phoneNumber || ''
    };
  }

  startEditManager(): void {
    if (!this.managerProfile) return;
    this.isEditing = true;
    this.editingType = 'manager';
    this.successMsg = '';
    this.errorMsg = '';
    this.managerEditForm = {
      firstName: (this.managerProfile.firstName || '').trim(),
      lastName: (this.managerProfile.lastName || '').trim(),
      phoneNumber: this.managerProfile.phoneNumber || ''
    };
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingType = null;
  }

  saveProfile(): void {
    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';

    const onSuccess = () => {
      this.saving = false;
      this.isEditing = false;
      this.successMsg = 'Profile updated successfully!';
      this.loadProfile();
    };
    const onError = (err: Error) => {
      this.saving = false;
      this.errorMsg = err.message || 'Failed to update profile.';
    };
    if (this.editingType === 'factory') {
      this.factoryApi.updateFactoryProfile({
        name: this.factoryEditForm.name.trim(),
        email: this.factoryEditForm.email.trim(),
        description: this.factoryEditForm.description.trim(),
        taxIdNumber: this.factoryEditForm.taxIdNumber.trim(),
        commercialRegisterNumber: this.factoryEditForm.commercialRegisterNumber.trim(),
        address: {
          country: this.factoryEditForm.address.country.trim(),
          state: this.factoryEditForm.address.state.trim(),
          city: this.factoryEditForm.address.city.trim(),
          street: this.factoryEditForm.address.street.trim(),
          buildingNumber: this.factoryEditForm.address.buildingNumber.trim()
        },
        phoneNumber: this.factoryEditForm.phoneNumber.trim()
      }).subscribe({
        next: onSuccess,
        error: onError
      });
    } else if (this.editingType === 'manager') {
      const firstName = this.managerEditForm.firstName.trim();
      const lastName = this.managerEditForm.lastName.trim();
      this.factoryApi.updateFactoryManagerProfile({
        firstName,
        lastName,
        phoneNumber: this.managerEditForm.phoneNumber.trim()
      }).subscribe({
        next: onSuccess,
        error: onError
      });
    } else {
      this.saving = false;
      this.errorMsg = 'Choose what to edit first.';
    }
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
