import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FactoryApiService,
  FactoryProfile,
  FactoryManager,
  FactoryManagerProfile
} from '../../../core/services/factory-api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-factory-profile',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, FormsModule],
  templateUrl: './factory-profile.component.html'
})
export class FactoryProfileComponent implements OnInit {
  profile: FactoryProfile | null = null;
  managerProfile: FactoryManagerProfile | null = null;
  managers: FactoryManager[] = [];
  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';

  // Edit form
  isEditing = false;
  isManagerAccount = false;
  editForm = {
    name: '',
    firstName: '',
    lastName: '',
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

  constructor(
    private readonly factoryApi: FactoryApiService,
    private readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.isManagerAccount =
      this.auth.getFactoryPortalAccountType() === 'manager';
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.errorMsg = '';
    const handleFactorySuccess = (fp: FactoryProfile) => {
      this.isManagerAccount = false;
      this.profile = fp;
      this.managerProfile = null;
      this.editForm = {
        name: fp.name || '',
        firstName: '',
        lastName: '',
        description: fp.description || '',
        taxIdNumber: fp.taxIdNumber || '',
        commercialRegisterNumber: fp.commercialRegisterNumber || '',
        address: {
          country: fp.address?.country || '',
          state: fp.address?.state || '',
          city: fp.address?.city || '',
          street: fp.address?.street || '',
          buildingNumber: fp.address?.buildingNumber || ''
        },
        phoneNumber: fp.phoneNumber || ''
      };
      this.loading = false;
      this.loadManagers();
    };
    const handleManagerSuccess = (mp: FactoryManagerProfile) => {
      this.isManagerAccount = true;
      this.managerProfile = mp;
      this.profile = null;
      const firstName = (mp.firstName || '').trim();
      const lastName = (mp.lastName || '').trim();
      const fullName = (mp.name || '').trim();
      this.editForm = {
        name: fullName || `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
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
        phoneNumber: mp.phoneNumber || ''
      };
      this.loading = false;
      this.managers = [];
    };
    const handleError = (err: Error) => {
      this.errorMsg = err.message || 'Failed to load factory profile.';
      this.loading = false;
    };
    if (this.isManagerAccount) {
      this.factoryApi.getFactoryManagerProfile().subscribe({
        next: profile => handleManagerSuccess(profile),
        error: handleError
      });
      return;
    }

    this.factoryApi.getFactoryProfile().subscribe({
      next: profile => handleFactorySuccess(profile),
      error: () => {
        this.factoryApi.getFactoryManagerProfile().subscribe({
          next: profile => handleManagerSuccess(profile),
          error: handleError
        });
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
    if (this.isManagerAccount && this.managerProfile) {
      const mp = this.managerProfile;
      this.editForm = {
        name: mp.name || `${mp.firstName || ''} ${mp.lastName || ''}`.trim(),
        firstName: (mp.firstName || '').trim(),
        lastName: (mp.lastName || '').trim(),
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
        phoneNumber: mp.phoneNumber || ''
      };
      return;
    }
    if (this.profile) {
      this.editForm = {
        name: this.profile.name || '',
        firstName: '',
        lastName: '',
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
    if (this.isManagerAccount) {
      const firstName = this.editForm.firstName.trim();
      const lastName = this.editForm.lastName.trim();
      this.factoryApi.updateFactoryManagerProfile({
        firstName,
        lastName,
        phoneNumber: this.editForm.phoneNumber.trim(),
        providedManagerId: this.getProvidedManagerId()
      }).subscribe({
        next: onSuccess,
        error: onError
      });
    } else {
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
        phoneNumber: this.editForm.phoneNumber.trim()
      }).subscribe({
        next: onSuccess,
        error: onError
      });
    }
  }

  onImageSelected(event: Event): void {
    if (this.isManagerAccount) {
      this.errorMsg = 'Profile image change is available for the factory account only.';
      return;
    }
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

  private getProvidedManagerId(): number {
    const token = this.auth.getToken();
    if (!token) return 0;
    try {
      const payloadRaw = token.split('.')[1];
      if (!payloadRaw) return 0;
      const base64 = payloadRaw.replace(/-/g, '+').replace(/_/g, '/');
      const json = atob(base64 + '==='.slice((base64.length + 3) % 4));
      const payload = JSON.parse(json) as Record<string, unknown>;
      const idCandidate =
        payload['providedManagerId'] ??
        payload['managerId'] ??
        payload['id'] ??
        payload['nameid'] ??
        payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
      if (typeof idCandidate === 'number' && Number.isFinite(idCandidate)) {
        return Math.max(0, Math.floor(idCandidate));
      }
      if (typeof idCandidate === 'string') {
        const parsed = parseInt(idCandidate, 10);
        return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
      }
      return 0;
    } catch {
      return 0;
    }
  }
}
