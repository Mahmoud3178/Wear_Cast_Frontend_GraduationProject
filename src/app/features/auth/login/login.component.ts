import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CustomerNavComponent } from '../../customer/shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../../customer/shared/customer-footer/customer-footer.component';
import { pendingCustomerUserIdStorageKey } from '../../../core/services/auth.service';

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
    this.resendInfoMessage = '';
    this.emailNotConfirmed = false;
    this.submitting = true;
    this.auth.login(this.form).subscribe({
      next: res => {
        this.submitting = false;
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
        } else if (res.role === 'SHIPPING') {
          void this.router.navigate(['/shipping/dashboard']);
        } else if (res.role === 'DRIVER') {
          void this.router.navigate(['/driver/dashboard']);
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
          void this.router.navigate(['/resend-confirmation/customer'], {
            queryParams: { email: this.form.email.trim() }
          });
        }
      }
    });
  }

}
