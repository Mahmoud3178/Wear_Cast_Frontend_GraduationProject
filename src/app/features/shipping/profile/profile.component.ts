import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShippingCompanyService } from '../../../core/services/shipping-company.service';
import { ShippingCompany, ShippingCompanyManager, UpdateShippingCompanyRequest, UpdateManagerRequest } from '../../../core/models/shipping-company.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-shipping-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ShippingProfileComponent implements OnInit {
  private profileService = inject(ShippingCompanyService);
  private authService = inject(AuthService);

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

  company: ShippingCompany | null = null;
  manager: ShippingCompanyManager | null = null;
  
  isLoadingCompany = true;
  isLoadingManager = true;

  // Edit states
  isEditingCompany = false;
  isEditingManager = false;
  managerImageUrl: string | null = null;

  // Form states
  companyForm: UpdateShippingCompanyRequest = {
    name: '',
    email: '',
    phoneNumber: '',
    commercialRegisterNumber: '',
    taxIdNumber: '',
    description: '',
    deliveryFee: 0,
    address: {
      state: '',
      city: '',
      street: '',
      buildingNumber: ''
    }
  };

  managerForm: UpdateManagerRequest = {
    firstName: '',
    lastName: '',
    phoneNumber: ''
  };

  ngOnInit() {
    this.loadCompanyProfile();
    this.loadManagerProfile();
    this.managerImageUrl = localStorage.getItem('managerImageUrl');
  }

  loadCompanyProfile() {
    this.isLoadingCompany = true;
    this.profileService.getCompany().subscribe({
      next: (data) => {
        this.company = data;
        this.companyForm = {
          name: data.name,
          email: data.email,
          phoneNumber: data.phoneNumber,
          commercialRegisterNumber: data.commercialRegisterNumber,
          taxIdNumber: data.taxIdNumber,
          description: data.description,
          deliveryFee: data.deliveryFee,
          address: {
            state: data.address?.state || '',
            city: data.address?.city || '',
            street: data.address?.street || '',
            buildingNumber: data.address?.buildingNumber || ''
          }
        };
        this.isLoadingCompany = false;
      },
      error: (err) => {
        console.error('Failed to load company profile', err);
        this.isLoadingCompany = false;
      }
    });
  }

  loadManagerProfile() {
    this.isLoadingManager = true;
    this.profileService.getManager().subscribe({
      next: (data) => {
        this.manager = data;
        this.managerForm = {
          firstName: data.firstName,
          lastName: data.lastName,
          phoneNumber: data.phoneNumber
        };
        this.isLoadingManager = false;
      },
      error: (err) => {
        console.error('Failed to load manager profile', err);
        this.isLoadingManager = false;
      }
    });
  }

  toggleEditCompany() {
    this.isEditingCompany = !this.isEditingCompany;
    if (!this.isEditingCompany && this.company) {
      // reset form
      this.companyForm = {
        name: this.company.name,
        email: this.company.email,
        phoneNumber: this.company.phoneNumber,
        commercialRegisterNumber: this.company.commercialRegisterNumber,
        taxIdNumber: this.company.taxIdNumber,
        description: this.company.description,
        deliveryFee: this.company.deliveryFee,
        address: {
          state: this.company.address?.state || '',
          city: this.company.address?.city || '',
          street: this.company.address?.street || '',
          buildingNumber: this.company.address?.buildingNumber || ''
        }
      };
    }
  }

  toggleEditManager() {
    this.isEditingManager = !this.isEditingManager;
    if (!this.isEditingManager && this.manager) {
      // reset form
      this.managerForm = {
        firstName: this.manager.firstName,
        lastName: this.manager.lastName,
        phoneNumber: this.manager.phoneNumber
      };
    }
  }

  saveCompany() {
    this.profileService.updateCompany(this.companyForm).subscribe({
      next: () => {
        this.isEditingCompany = false;
        this.loadCompanyProfile();
      },
      error: (err) => {
        console.error('Failed to update company profile', err);
        alert('Failed to update company profile.');
      }
    });
  }

  saveManager() {
    this.profileService.updateManager(this.managerForm).subscribe({
      next: () => {
        this.isEditingManager = false;
        this.loadManagerProfile();
      },
      error: (err) => {
        console.error('Failed to update manager profile', err);
        alert('Failed to update manager profile.');
      }
    });
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('NewLogo', file);
      this.profileService.updateCompanyImage(formData).subscribe({
        next: () => {
          this.loadCompanyProfile();
        },
        error: (err) => {
          console.error('Failed to upload image', err);
          alert('Failed to upload image.');
        }
      });
    }
  }

  onManagerImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.managerImageUrl = e.target.result;
        localStorage.setItem('managerImageUrl', this.managerImageUrl!);
      };
      reader.readAsDataURL(file);
    }
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
