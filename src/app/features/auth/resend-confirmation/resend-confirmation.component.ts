import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AuthService,
  pendingCustomerUserIdStorageKey,
  pendingFactoryUserIdStorageKey
} from '../../../core/services/auth.service';

@Component({
  selector: 'app-resend-confirmation',
  standalone: true,
  imports: [FormsModule, NgIf, RouterLink],
  templateUrl: './resend-confirmation.component.html'
})
export class ResendConfirmationComponent implements OnInit {
  email = '';
  type: 'customer' | 'factory-manager' = 'customer';
  
  submitting = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly auth: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.type = this.route.snapshot.paramMap.get('type') as 'customer' | 'factory-manager' || 'customer';
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
  }

  resend(): void {
    const em = this.email.trim();
    if (!em) {
      this.errorMessage = 'Please enter your email.';
      return;
    }
    
    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const obs$ = this.type === 'factory-manager' 
      ? this.auth.resendFactoryManagerConfirmationEmail(em)
      : this.auth.resendConfirmationEmail(em);

    obs$.subscribe({
      next: (res) => {
        this.submitting = false;
        if (res.userId) {
          if (this.type === 'factory-manager') {
            sessionStorage.setItem(pendingFactoryUserIdStorageKey(em), res.userId);
          } else {
            sessionStorage.setItem(pendingCustomerUserIdStorageKey(em), res.userId);
          }
        }
        void this.router.navigate([`/confirm-email/${this.type}`], { queryParams: { email: em } });
      },
      error: (e: Error) => {
        this.submitting = false;
        this.errorMessage = e.message || 'Could not resend email. Please try again.';
      }
    });
  }
}
