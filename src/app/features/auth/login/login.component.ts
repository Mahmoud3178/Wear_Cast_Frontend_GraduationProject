import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, NgIf],
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {
  form = {
    email: '',
    password: ''
  };

  errorMessage = '';
  submitting = false;
  emailNotConfirmed = false;
  resendSubmitting = false;
  resendInfoMessage = '';
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
        } else if (res.role === 'FACTORY') {
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
      }
    });
  }

  resendConfirmation(): void {
    const email = this.form.email.trim();
    if (!email) {
      this.resendInfoMessage = 'Enter your email above first.';
      return;
    }
    this.resendSubmitting = true;
    this.resendInfoMessage = '';
    this.auth.resendConfirmationEmail(email).subscribe({
      next: () => {
        this.resendSubmitting = false;
        this.resendInfoMessage =
          'If this email is registered, a new confirmation message was sent. Check inbox and spam. If nothing arrives, the server may not be configured to send mail yet—ask the API team.';
      },
      error: (e: Error) => {
        this.resendSubmitting = false;
        this.resendInfoMessage = e.message || 'Could not resend email.';
      }
    });
  }
}
