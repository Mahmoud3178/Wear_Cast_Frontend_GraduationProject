import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-confirm-seller-email',
  standalone: true,
  imports: [FormsModule, NgIf, RouterLink],
  templateUrl: './confirm-seller-email.component.html'
})
export class ConfirmSellerEmailComponent implements OnInit, OnDestroy {
  /** Seller manager email from the application form. */
  email = '';
  code = '';

  errorMessage = '';
  successMessage = '';
  submitting = false;
  resendSubmitting = false;

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

  onCodeInput(raw: string): void {
    this.code = raw.replace(/\D/g, '').slice(0, 8);
  }

  confirm(): void {
    this.errorMessage = '';
    this.successMessage = '';
    const em = this.email.trim();
    const c = this.code.trim();
    if (!em) {
      this.errorMessage = 'Enter the seller manager email you used on the application.';
      return;
    }
    if (c.length < 4) {
      this.errorMessage = 'Enter the verification code from your email.';
      return;
    }
    this.submitting = true;
    this.auth.confirmSellerEmail(em, c).subscribe({
      next: () => {
        this.submitting = false;
        this.successMessage = 'Email confirmed. You can sign in when your seller account is approved.';
        setTimeout(() => void this.router.navigate(['/login'], {
          queryParams: { email: em }
        }), 1500);
      },
      error: (e: Error) => {
        this.submitting = false;
        this.errorMessage =
          e.message ||
          'Confirmation failed. Check the code or resend a new email.';
      }
    });
  }

  resend(): void {
    const em = this.email.trim();
    if (!em) {
      this.errorMessage = 'Enter your seller manager email first.';
      return;
    }
    this.resendSubmitting = true;
    this.errorMessage = '';
    this.auth.resendSellerConfirmationEmail(em).subscribe({
      next: () => {
        this.resendSubmitting = false;
        this.successMessage =
          'If this application exists, a new confirmation email was sent.';
      },
      error: (e: Error) => {
        this.resendSubmitting = false;
        this.errorMessage = e.message || 'Could not resend.';
      }
    });
  }
}
