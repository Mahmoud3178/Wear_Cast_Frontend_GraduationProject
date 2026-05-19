import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShippingCompanyService } from '../../../core/services/shipping-company.service';
import { CreateManagerRequest, UpdateManagerRequest } from '../../../core/models/shipping-company.model';

@Component({
  selector: 'app-managers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './managers.component.html',
  styleUrl: './managers.component.css'
})
export class ManagersComponent implements OnInit {
  private companyService = inject(ShippingCompanyService);

  managers: any[] = [];
  isLoading = false;

  // New/Edit Manager Form Fields
  newManager = {
    id: 0,
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  };

  showAddModal = false;
  isEditMode = false;
  isSubmitting = false;
  errorMessage: string | null = null;
  showPasswordState = false;
  showConfirmPasswordState = false;

  // Delete Manager Modal Fields
  showDeleteModal = false;
  managerToDelete: any | null = null;
  deletionReason = '';
  isDeleting = false;

  currentUserEmail = '';

  ngOnInit() {
    this.loadManagers();
    this.currentUserEmail = this.getLoggedInEmail();
  }

  getLoggedInEmail(): string {
    const token = localStorage.getItem('token');
    if (!token) return '';
    try {
      const part = token.split('.')[1];
      if (!part) return '';
      const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '==='.slice((base64.length + 3) % 4);
      const json = atob(padded);
      const payload = JSON.parse(json);
      
      const keys = [
        'email',
        'unique_name',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'
      ];
      for (const k of keys) {
        const v = payload[k];
        if (typeof v === 'string' && v.includes('@')) {
          return v.trim().toLowerCase();
        }
      }
      return '';
    } catch {
      return '';
    }
  }

  loadManagers() {
    this.isLoading = true;
    this.companyService.getAllManagers().subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        this.managers = Array.isArray(data) ? data : [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch company managers', err);
        this.isLoading = false;
      }
    });
  }

  openAddModal() {
    this.isEditMode = false;
    this.errorMessage = null;
    this.showPasswordState = false;
    this.showConfirmPasswordState = false;
    this.newManager = {
      id: 0,
      email: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      password: '',
      confirmPassword: ''
    };
    this.showAddModal = true;
  }

  openEditModal(manager: any) {
    this.isEditMode = true;
    this.errorMessage = null;
    this.showPasswordState = false;
    this.showConfirmPasswordState = false;
    this.newManager = {
      id: manager.id || manager.Id || manager.managerId || manager.ManagerId || 0,
      email: manager.email || manager.Email || '',
      firstName: manager.firstName || manager.FirstName || '',
      lastName: manager.lastName || manager.LastName || '',
      phoneNumber: manager.phoneNumber || manager.PhoneNumber || '',
      password: '',
      confirmPassword: ''
    };
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
    this.errorMessage = null;
    this.showPasswordState = false;
    this.showConfirmPasswordState = false;
  }

  togglePasswordVisibility() {
    this.showPasswordState = !this.showPasswordState;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPasswordState = !this.showConfirmPasswordState;
  }

  saveManager() {
    this.errorMessage = null;
    if (this.isEditMode) {
      this.updateManager();
    } else {
      this.createManager();
    }
  }

  createManager() {
    if (!this.newManager.email || !this.newManager.firstName || !this.newManager.lastName || 
        !this.newManager.phoneNumber || !this.newManager.password || !this.newManager.confirmPassword) {
      this.errorMessage = 'All fields are required.';
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.newManager.email)) {
      this.errorMessage = 'Please enter a valid email address.';
      return;
    }

    // First and last name checks (3 to 50 chars)
    if (this.newManager.firstName.length < 3 || this.newManager.firstName.length > 50) {
      this.errorMessage = 'First name must be between 3 and 50 characters.';
      return;
    }
    if (this.newManager.lastName.length < 3 || this.newManager.lastName.length > 50) {
      this.errorMessage = 'Last name must be between 3 and 50 characters.';
      return;
    }

    // Granular Phone Number Validations
    const rawPhone = this.newManager.phoneNumber.trim();
    if (!/^\d+$/.test(rawPhone)) {
      this.errorMessage = 'Phone number must contain numbers only (no spaces, letters, or symbols).';
      return;
    }
    if (rawPhone.length !== 11) {
      this.errorMessage = `Phone number must be exactly 11 digits long (currently you entered ${rawPhone.length} digits).`;
      return;
    }
    const egyptianPhoneRegex = /^01[0125][0-9]{8}$/;
    if (!egyptianPhoneRegex.test(rawPhone)) {
      this.errorMessage = 'Phone number must start with a valid Egyptian mobile provider prefix (010, 011, 012, or 015).';
      return;
    }

    if (this.newManager.password !== this.newManager.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    // Strict password match to RegexPatterns.Password (at least 8 chars, 1 digit, 1 special char, 1 lower, 1 upper)
    const passwordRegex = /^(?=.*[0-9])(?=.*[\!@#$%^&*()\\\[\]{}_\-+=\~`|:;\"'<>,./?])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    if (!passwordRegex.test(this.newManager.password)) {
      this.errorMessage = 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one numeric digit, and one special character (e.g. !@#$).';
      return;
    }

    this.isSubmitting = true;
    const request: CreateManagerRequest = {
      email: this.newManager.email,
      firstName: this.newManager.firstName,
      lastName: this.newManager.lastName,
      phoneNumber: this.newManager.phoneNumber,
      password: this.newManager.password,
      confirmPassword: this.newManager.confirmPassword
    };

    this.companyService.createManager(request).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeAddModal();
        this.loadManagers();
        alert('Shipping Company Manager registered successfully!');
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Failed to create manager', err);
        this.errorMessage = this.parseErrorMessage(err);
      }
    });
  }

  updateManager() {
    if (!this.newManager.firstName || !this.newManager.lastName || !this.newManager.phoneNumber) {
      this.errorMessage = 'First Name, Last Name, and Phone Number are required.';
      return;
    }

    // First and last name checks (3 to 50 chars)
    if (this.newManager.firstName.length < 3 || this.newManager.firstName.length > 50) {
      this.errorMessage = 'First name must be between 3 and 50 characters.';
      return;
    }
    if (this.newManager.lastName.length < 3 || this.newManager.lastName.length > 50) {
      this.errorMessage = 'Last name must be between 3 and 50 characters.';
      return;
    }

    // Granular Phone Number Validations
    const rawPhone = this.newManager.phoneNumber.trim();
    if (!/^\d+$/.test(rawPhone)) {
      this.errorMessage = 'Phone number must contain numbers only (no spaces, letters, or symbols).';
      return;
    }
    if (rawPhone.length !== 11) {
      this.errorMessage = `Phone number must be exactly 11 digits long (currently you entered ${rawPhone.length} digits).`;
      return;
    }
    const egyptianPhoneRegex = /^01[0125][0-9]{8}$/;
    if (!egyptianPhoneRegex.test(rawPhone)) {
      this.errorMessage = 'Phone number must start with a valid Egyptian mobile provider prefix (010, 011, 012, or 015).';
      return;
    }

    this.isSubmitting = true;
    const request: any = {
      firstName: this.newManager.firstName,
      lastName: this.newManager.lastName,
      phoneNumber: this.newManager.phoneNumber,
      providedManagerId: this.newManager.id,
      FirstName: this.newManager.firstName,
      LastName: this.newManager.lastName,
      PhoneNumber: this.newManager.phoneNumber,
      ProvidedManagerId: this.newManager.id
    };

    this.companyService.updateManager(request).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeAddModal();
        this.loadManagers();
        alert('Manager profile updated successfully!');
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Failed to update manager', err);
        this.errorMessage = this.parseErrorMessage(err);
      }
    });
  }

  openDeleteModal(manager: any) {
    const email = (manager.email || manager.Email || '').toLowerCase();
    if (email === this.currentUserEmail.toLowerCase()) {
      alert('You cannot delete yourself!');
      return;
    }
    this.managerToDelete = manager;
    this.deletionReason = '';
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.managerToDelete = null;
    this.deletionReason = '';
  }

  deleteManager() {
    if (!this.managerToDelete) return;
    if (!this.deletionReason.trim()) {
      alert('A deletion reason must be specified.');
      return;
    }

    this.isDeleting = true;
    const managerId = this.managerToDelete.id || this.managerToDelete.Id || this.managerToDelete.managerId || this.managerToDelete.ManagerId;
    this.companyService.deleteManager(managerId, this.deletionReason).subscribe({
      next: () => {
        this.isDeleting = false;
        this.closeDeleteModal();
        this.loadManagers();
        alert('Manager deleted successfully.');
      },
      error: (err) => {
        this.isDeleting = false;
        console.error('Failed to delete manager', err);
        const errMsg = this.parseErrorMessage(err);
        alert(errMsg);
      }
    });
  }

  parseErrorMessage(err: any): string {
    let errMsg = 'An unexpected error occurred. Role or validation constraints may prevent this action.';
    if (err.error) {
      if (typeof err.error === 'string') {
        errMsg = err.error;
      } else if (err.error.error && typeof err.error.error === 'object' && err.error.error.description) {
        errMsg = err.error.error.description;
      } else if (err.error.error && typeof err.error.error === 'object' && err.error.error.message) {
        errMsg = err.error.error.message;
      } else if (err.error.message) {
        errMsg = err.error.message;
      } else if (err.error.title) {
        errMsg = err.error.title;
      } else if (err.error.errors) {
        const validationErrors = err.error.errors;
        const messages = [];
        for (const key in validationErrors) {
          if (validationErrors.hasOwnProperty(key)) {
            const item = validationErrors[key];
            if (Array.isArray(item)) {
              messages.push(...item);
            } else if (typeof item === 'string') {
              messages.push(item);
            }
          }
        }
        if (messages.length > 0) {
          errMsg = messages.join('\n');
        }
      } else {
        errMsg = JSON.stringify(err.error);
      }
    } else if (err.message) {
      errMsg = err.message;
    }
    return errMsg;
  }

  getInitials(name: string): string {
    if (!name) return 'M';
    return name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
  }
}
