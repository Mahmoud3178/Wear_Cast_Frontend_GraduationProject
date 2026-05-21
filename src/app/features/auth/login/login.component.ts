import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CustomerNavComponent } from '../../customer/shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../../customer/shared/customer-footer/customer-footer.component';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, NgIf, CustomerNavComponent, CustomerFooterComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  form = {
    email: '',
    password: ''
  };

  errorMessage = '';
  submitting = false;
  emailNotConfirmed = false;
  showPassword = false;

  // New properties for inline email verification
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
  }

  login(): void {
    this.errorMessage = '';
    this.emailNotConfirmed = false;
    this.submitting = true;
    this.auth.login(this.form).subscribe({
      next: res => {
        this.submitting = false;
        if (res.role === 'SHIPPING' || res.role === 'DRIVER') {
          // Clear session immediately as they logged in on the wrong portal
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('role');
          void this.router.navigate(['/driver-shipping/login'], {
            queryParams: { email: this.form.email, redirected: 'true' }
          });
          return;
        }
        this.auth.saveUser(res);
        if (res.role === 'ADMIN') {
          void this.router.navigate(['/admin']);
        } else if (
          res.role === 'FACTORY' ||
          res.role === 'FACTORY_MANAGER'
        ) {
          void this.router.navigate(['/factory']);
        } else if (res.role === 'SELLER') {
          void this.router.navigate(['/seller/dashboard']);
        } else {
          void this.router.navigate(['/customer']);
        }
      },
      error: (e: Error) => {
        this.submitting = false;
        this.errorMessage = e.message || 'Login failed';
        this.emailNotConfirmed = /email is not confirmed/i.test(
          this.errorMessage
        );
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
        
        // Auto login!
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

  resendConfirmation(): void {
    const email = this.form.email.trim();
    if (!email) {
      this.errorMessage = 'Please enter your email address in the Email field first.';
      this.emailNotConfirmed = false;
      return;
    }
    this.errorMessage = '';
    this.emailNotConfirmed = false;
    this.submitting = true;
    this.auth.resendConfirmationEmail(email).subscribe({
      next: () => {
        this.submitting = false;
        this.showConfirmBox = true;
        this.confirmCode = '';
        this.verificationError = '';
        this.verificationSuccess = 'Confirmation code resent! Please check your email.';
        setTimeout(() => this.verificationSuccess = '', 4000);
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err.message || 'Failed to resend confirmation email.';
      }
    });
  }

}
