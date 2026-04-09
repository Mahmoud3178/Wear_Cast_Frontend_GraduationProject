import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  FactoryApiService,
  FactoryRegisterForm
} from '../../../core/services/factory-api.service';
import { pendingCustomerUserIdStorageKey } from '../../../core/services/auth.service';

@Component({
  selector: 'app-factory-register',
  standalone: true,
  imports: [FormsModule, NgIf, RouterLink],
  templateUrl: './factory-register.component.html'
})
export class FactoryRegisterComponent {
  form: FactoryRegisterForm = {
    managerEmail: '',
    managerFirstName: '',
    managerLastName: '',
    managerPhoneNumber: '',
    managerPassword: '',
    managerConfirmPassword: '',
    factoryName: '',
    factoryEmail: '',
    factoryPhoneNumber: '',
    factoryCommercialRegisterNumber: '',
    factoryTaxIdNumber: '',
    factoryDescription: '',
    factoryLogo: null,
    factoryState: '',
    factoryCity: '',
    factoryStreet: '',
    factoryBuildingNumber: ''
  };

  errorMessage = '';
  successMessage = '';
  submitting = false;

  constructor(
    private readonly factoryApi: FactoryApiService,
    private readonly router: Router
  ) {}

  onLogoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.form.factoryLogo = file;
  }

  register(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.factoryLogo) {
      this.errorMessage = 'Factory logo is required.';
      return;
    }
    if (this.form.managerPassword !== this.form.managerConfirmPassword) {
      this.errorMessage = 'Manager passwords do not match.';
      return;
    }
    if ((this.form.factoryDescription ?? '').trim().length < 20) {
      this.errorMessage =
        'Description must be at least 20 characters (API requirement).';
      return;
    }

    this.submitting = true;
    this.factoryApi.createFactory(this.form).subscribe({
      next: ({ userManagerId }) => {
        this.submitting = false;
        this.successMessage =
          'Factory created. Confirm your email with the code we sent you.';
        const email = this.form.managerEmail.trim();
        if (email) {
          sessionStorage.setItem(pendingCustomerUserIdStorageKey(email), userManagerId);
        }
        void this.router.navigate(['/confirm-email/customer'], {
          queryParams: {
            email,
            userId: userManagerId
          }
        });
      },
      error: (e: Error) => {
        this.submitting = false;
        this.errorMessage = e.message || 'Factory registration failed.';
      }
    });
  }
}

