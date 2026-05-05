import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login-admin',
  standalone: true,
  imports: [FormsModule, NgIf],
  templateUrl: './login-admin.component.html',
  styleUrl: './login-admin.component.css'
})
export class LoginAdminComponent {

  form = {
    email: '',
    password: ''
  };

  errorMessage = '';
  submitting = false;
  showPassword = false;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  login(): void {
    this.errorMessage = '';
    this.submitting = true;

    this.auth.login(this.form).subscribe({
      next: (res: any) => {
        this.submitting = false;

        if (res.role !== 'ADMIN') {
          this.errorMessage = 'Access denied: Admins only';
          return;
        }

        this.auth.saveUser(res);
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err.message || 'Login failed. Please check your credentials.';
      }
    });
  }
}
