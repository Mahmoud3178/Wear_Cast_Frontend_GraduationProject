import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, NgIf, RouterLink],
  templateUrl: './forgot-password.component.html'
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  email = '';
  errorMessage = '';
  successMessage = '';
  submitting = false;

  private sub?: Subscription;

  constructor(
    private readonly auth: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.sub = this.route.queryParamMap.subscribe(params => {
      this.email = params.get('email')?.trim() ?? '';
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  submit(): void {
    const em = this.email.trim();
    if (!em) {
      this.errorMessage = 'Enter your email address.';
      return;
    }
    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.auth.forgetPassword(em).subscribe({
      next: () => {
        this.submitting = false;
        this.successMessage = 'A verification code has been sent to your email. Redirecting to reset password page...';
        setTimeout(() => void this.router.navigate(['/reset-password'], {
          queryParams: { email: em }
        }), 2000);
      },
      error: (e: Error) => {
        this.submitting = false;
        this.errorMessage = e.message || 'Could not send verification code.';
      }
    });
  }
}
