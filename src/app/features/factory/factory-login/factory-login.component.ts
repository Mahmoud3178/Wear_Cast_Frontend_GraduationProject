import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, pendingFactoryUserIdStorageKey } from '../../../core/services/auth.service';

@Component({
  selector: 'app-factory-login',
  standalone: true,
  imports: [FormsModule, RouterLink, NgIf],
  templateUrl: './factory-login.component.html'
})
export class FactoryLoginComponent {
  form = { email: '', password: '' };
  errorMessage = '';
  submitting = false;
  showPassword = false;
  emailNotConfirmed = false;
  resendSubmitting = false;
  resendInfoMessage = '';

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  login(): void {
    this.errorMessage = '';
    this.resendInfoMessage = '';
    this.emailNotConfirmed = false;
    this.submitting = true;
    this.auth.login(this.form).subscribe({
      next: res => {
        this.submitting = false;
        const role = (res.role || '').toUpperCase();
        if (role !== 'FACTORY' && role !== 'FACTORY_MANAGER') {
          this.errorMessage =
            'This portal is for factory accounts only (factory or factory manager). Use the main sign-in for customers.';
          return;
        }
        this.auth.setFactoryPortalAccountType('manager');
        this.auth.saveUser(res);
        void this.router.navigate(['/factory']);
      },
      error: (e: Error) => {
        this.submitting = false;
        this.errorMessage = e.message || 'Sign-in failed';
        this.emailNotConfirmed = /email is not confirmed/i.test(this.errorMessage);
        if (this.emailNotConfirmed) {
          this.resendConfirmation();
        }
      }
    });
  }

  resendConfirmation(): void {
    const email = this.form.email.trim();
    if (!email) {
      this.resendInfoMessage = 'Enter your email above first.';
      return;
    }
    this.resendSubmitting = true;
    this.resendInfoMessage = '';
    // Use the generic resend for factory manager/factory accounts
    this.auth.resendFactoryManagerConfirmationEmail(email).subscribe({
      next: (res) => {
        this.resendSubmitting = false;
        if (res.userId) {
          sessionStorage.setItem(pendingFactoryUserIdStorageKey(email), res.userId);
        }
        void this.router.navigate(['/confirm-email/factory-manager'], { queryParams: { email } });
      },
      error: (e: Error) => {
        this.resendSubmitting = false;
        this.resendInfoMessage = e.message || 'Could not resend email.';
      }
    });
  }
}
