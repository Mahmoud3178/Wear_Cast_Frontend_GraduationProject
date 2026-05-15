import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, pendingFactoryUserIdStorageKey } from '../../../core/services/auth.service';

@Component({
  selector: 'app-confirm-factory-manager-email',
  standalone: true,
  imports: [FormsModule, NgIf, RouterLink],
  templateUrl: './confirm-factory-manager-email.component.html'
})
export class ConfirmFactoryManagerEmailComponent implements OnInit, OnDestroy {
  /** Factory manager email (for display and resend). */
  email = '';
  /** User ID from registration (required for confirmation). */
  userId = '';
  /** Whether userId was pre-filled from query params (read-only mode). */
  userIdFromQuery = false;
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
      let uid = params.get('userId')?.trim() ?? '';
      if (!uid && this.email) {
        const stored = sessionStorage.getItem(pendingFactoryUserIdStorageKey(this.email));
        if (stored) {
          uid = stored;
        }
      }
      this.userId = uid;
      this.userIdFromQuery = !!uid;
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
    const uid = this.userId.trim();
    const c = this.code.trim();
    if (!uid) {
      this.errorMessage = 'User ID is missing. Please check the link from your email or contact support.';
      return;
    }
    if (c.length < 4) {
      this.errorMessage = 'Enter the verification code from your email.';
      return;
    }
    this.submitting = true;
    this.auth.confirmFactoryManagerEmail(uid, c).subscribe({
      next: () => {
        this.submitting = false;
        this.successMessage = 'Email confirmed. You can now sign in to the factory portal.';
        setTimeout(() => void this.router.navigate(['/factory/login'], {
          queryParams: this.email ? { email: this.email } : {}
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
      this.errorMessage = 'Enter your factory manager email first.';
      return;
    }
    this.resendSubmitting = true;
    this.errorMessage = '';
    this.auth.resendFactoryManagerConfirmationEmail(em).subscribe({
      next: (res) => {
        this.resendSubmitting = false;
        this.successMessage =
          'If this account exists, a new confirmation email was sent.';
        if (res.userId) {
          this.userId = res.userId;
          sessionStorage.setItem(pendingFactoryUserIdStorageKey(em), res.userId);
        }
      },
      error: (e: Error) => {
        this.resendSubmitting = false;
        this.errorMessage = e.message || 'Could not resend.';
      }
    });
  }
}
