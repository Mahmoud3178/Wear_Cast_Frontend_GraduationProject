import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, NgIf, RouterLink],
  templateUrl: './reset-password.component.html'
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  form = {
    email: '',
    code: '',
    newPassword: '',
    confirmNewPassword: ''
  };

  errorMessage = '';
  successMessage = '';
  submitting = false;

  showNewPassword = false;
  showConfirmPassword = false;

  private sub?: Subscription;

  constructor(
    private readonly auth: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.sub = this.route.queryParamMap.subscribe(params => {
      this.form.email = params.get('email')?.trim() ?? '';
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.email.trim()) {
      this.errorMessage = 'Email is required.';
      return;
    }
    if (!this.form.code.trim()) {
      this.errorMessage = 'Verification code is required.';
      return;
    }
    if (!this.form.newPassword) {
      this.errorMessage = 'New password is required.';
      return;
    }
    if (this.form.newPassword !== this.form.confirmNewPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.submitting = true;
    
    this.auth.resetPassword(this.form).subscribe({
      next: () => {
        this.submitting = false;
        this.successMessage = 'Password has been reset successfully. Redirecting to login...';
        setTimeout(() => void this.router.navigate(['/login'], {
          queryParams: { email: this.form.email }
        }), 2000);
      },
      error: (e: Error) => {
        this.submitting = false;
        this.errorMessage = e.message || 'Could not reset password.';
      }
    });
  }
}
