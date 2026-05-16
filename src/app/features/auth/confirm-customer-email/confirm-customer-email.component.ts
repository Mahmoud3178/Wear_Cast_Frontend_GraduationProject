import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  AuthService,
  pendingCustomerUserIdStorageKey
} from '../../../core/services/auth.service';

@Component({
  selector: 'app-confirm-customer-email',
  standalone: true,
  imports: [FormsModule, NgIf, RouterLink],
  templateUrl: './confirm-customer-email.component.html'
})
export class ConfirmCustomerEmailComponent implements OnInit, OnDestroy {
  email = '';
  userId = '';
  code = '';

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
      this.userId = params.get('userId')?.trim() ?? '';
      if (!this.userId && this.email) {
        const stored = sessionStorage.getItem(
          pendingCustomerUserIdStorageKey(this.email)
        );
        if (stored) {
          this.userId = stored;
        }
      }
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
      this.errorMessage =
        'User ID is missing. It is saved automatically after you register on this device, or paste the ID from your registration success screen.';
      return;
    }
    if (c.length < 4) {
      this.errorMessage = 'Enter the verification code from your email.';
      return;
    }
    this.submitting = true;
    this.auth.confirmCustomerEmail(uid, c).subscribe({
      next: () => {
        this.submitting = false;
        if (this.email) {
          sessionStorage.removeItem(pendingCustomerUserIdStorageKey(this.email));
        }
        this.successMessage = 'Email confirmed. You can sign in now.';
        setTimeout(() => void this.router.navigate(['/login'], {
          queryParams: this.email ? { email: this.email } : {}
        }), 1200);
      },
      error: (e: Error) => {
        this.submitting = false;
        this.errorMessage =
          e.message ||
          'Confirmation failed. The code may be wrong or expired (often 60 minutes).';
      }
    });
  }

}
