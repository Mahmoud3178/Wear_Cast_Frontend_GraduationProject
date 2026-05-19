import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-confirm-customer-email',
  standalone: true,
  imports: [FormsModule, NgIf, RouterLink],
  templateUrl: './confirm-customer-email.component.html'
})
export class ConfirmCustomerEmailComponent implements OnInit, OnDestroy {
  email = '';
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
      this.errorMessage = 'Enter the email address you used when registering.';
      return;
    }
    if (c.length < 4) {
      this.errorMessage = 'Enter the verification code from your email.';
      return;
    }
    this.submitting = true;
    this.auth.confirmCustomerEmail(em, c).subscribe({
      next: () => {
        this.submitting = false;
        this.successMessage = 'Email confirmed. You can sign in now.';
        setTimeout(() => void this.router.navigate(['/login'], {
          queryParams: { email: em }
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
