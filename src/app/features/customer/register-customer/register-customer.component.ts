import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register-customer',
  standalone: true,
  imports: [FormsModule, NgIf, RouterLink],
  templateUrl: './register-customer.component.html'
})
export class RegisterCustomerComponent {
  form = {
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    profileImage: null as File | null,
    state: '',
    city: '',
    street: '',
    buildingNumber: ''
  };

  errorMessage = '';
  submitting = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.form.profileImage = file ?? null;
  }

  register(): void {
    this.errorMessage = '';

    if (this.form.password !== this.form.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.submitting = true;
    this.auth.registerCustomer(this.form).subscribe({
      next: () => {
        this.submitting = false;
        this.auth.saveCustomerProfileFromRegister(this.form);
        const email = this.form.email.trim();
        void this.router.navigate(['/confirm-email/customer'], {
          queryParams: { email }
        });
      },
      error: (e: Error) => {
        this.submitting = false;
        this.errorMessage = e.message || 'Registration failed.';
      }
    });
  }
}
