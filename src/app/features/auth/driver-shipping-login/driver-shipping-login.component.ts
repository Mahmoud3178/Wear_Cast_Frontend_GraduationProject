import { Component, OnInit } from '@angular/core';
import { NgIf, NgClass } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-driver-shipping-login',
  standalone: true,
  imports: [FormsModule, RouterLink, NgIf, NgClass],
  templateUrl: './driver-shipping-login.component.html',
  styleUrl: './driver-shipping-login.component.css'
})
export class DriverShippingLoginComponent implements OnInit {
  selectedRole: 'DRIVER' | 'SHIPPING' = 'DRIVER';

  form = {
    email: '',
    password: ''
  };

  errorMessage = '';
  infoMessage = '';
  submitting = false;
  emailNotConfirmed = false;
  showPassword = false;

  // Email verification properties
  showConfirmBox = false;
  confirmCode = '';
  verificationError = '';
  verificationSuccess = '';
  verifying = false;

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) {
      this.form.email = email;
    }
    const redirected = this.route.snapshot.queryParamMap.get('redirected');
    if (redirected === 'true') {
      this.infoMessage = 'Driver and Shipping accounts must sign in using this dedicated portal.';
    }
  }

  selectRole(role: 'DRIVER' | 'SHIPPING'): void {
    this.selectedRole = role;
    this.errorMessage = '';
    this.infoMessage = '';
  }

  login(): void {
    this.errorMessage = '';
    this.infoMessage = '';
    this.emailNotConfirmed = false;

    if (!this.form.email.trim() || !this.form.password) {
      this.errorMessage = 'Please provide both email and password.';
      return;
    }

    this.submitting = true;
    this.auth.login(this.form).subscribe({
      next: res => {
        this.submitting = false;

        // Verify the authenticated role matches the selected tab role
        const returnedRole = (res.role || '').toUpperCase();
        if (returnedRole !== this.selectedRole) {
          // If the role does not match, sign out and throw error
          this.auth.logout(); // Clears any saved state
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('role');

          if (returnedRole === 'DRIVER' || returnedRole === 'SHIPPING') {
            const roleLabel = returnedRole === 'DRIVER' ? 'Driver' : 'Shipping Company';
            this.errorMessage = `This account is registered as a ${roleLabel}. Please switch to the correct tab to sign in.`;
          } else {
            this.errorMessage = 'This portal is restricted to Drivers and Shipping Companies only.';
          }
          return;
        }

        // Save session and redirect
        this.auth.saveUser(res);
        if (returnedRole === 'DRIVER') {
          void this.router.navigate(['/driver/dashboard']);
        } else if (returnedRole === 'SHIPPING') {
          void this.router.navigate(['/shipping/dashboard']);
        }
      },
      error: (e: Error) => {
        this.submitting = false;
        this.errorMessage = e.message || 'Login failed';
        this.emailNotConfirmed = /email is not confirmed/i.test(this.errorMessage);

        if (this.emailNotConfirmed) {
          const email = this.form.email.trim();
          this.errorMessage = 'Your email is not confirmed yet. Initiating email confirmation code...';
          this.submitting = true;

          // Call resend confirmation email
          this.auth.resendConfirmationEmail(email).subscribe({
            next: () => {
              this.submitting = false;
              this.showConfirmBox = true;
              this.errorMessage = '';
            },
            error: (resendErr) => {
              this.submitting = false;
              this.errorMessage = resendErr.message || 'Failed to resend confirmation email.';
            }
          });
        }
      }
    });
  }

  verifyCode(): void {
    if (!this.confirmCode.trim()) {
      this.verificationError = 'Please enter the verification code.';
      return;
    }
    this.verificationError = '';
    this.verificationSuccess = '';
    this.verifying = true;

    const email = this.form.email.trim();
    if (!email) {
      this.verificationError = 'Email is required.';
      this.verifying = false;
      return;
    }

    this.auth.confirmCustomerEmail(email, this.confirmCode.trim()).subscribe({
      next: () => {
        this.verifying = false;
        this.verificationSuccess = 'Email confirmed successfully! Logging you in...';
        
        // Auto login
        setTimeout(() => {
          this.showConfirmBox = false;
          this.login();
        }, 1500);
      },
      error: (err) => {
        this.verifying = false;
        this.verificationError = err.message || 'Verification failed. Please check the code and try again.';
      }
    });
  }
}
