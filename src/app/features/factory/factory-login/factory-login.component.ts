import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

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

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  login(): void {
    this.errorMessage = '';
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
          void this.router.navigate(['/resend-confirmation/factory-manager'], {
            queryParams: { email: this.form.email.trim() }
          });
        }
      }
    });
  }

}
