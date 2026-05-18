import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-register-seller',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register-seller.component.html',
  styleUrl: './register-seller.component.css'
})
export class RegisterSellerComponent {
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  errorMsg = '';
  fieldErrors: Record<string, string> = {};

  form = {
    sellerManagerEmail: '',
    sellerManagerFirstName: '',
    sellerManagerLastName: '',
    sellerManagerPhoneNumber: '',
    sellerManagerPassword: '',
    sellerManagerConfirmPassword: '',
    sellerName: '',
    sellerEmail: '',
    sellerPhoneNumber: '',
    sellerCommercialRegisterNumber: '',
    sellerTaxIdNumber: '',
    sellerDescription: '',
    sellerLogo: null as File | null,
    sellerState: '',
    sellerCity: '',
    sellerStreet: '',
    sellerBuildingNumber: ''
  };

  constructor(private auth: AuthService, private router: Router) {}

  onFileChange(event: any) {
    this.form.sellerLogo = event.target.files[0] ?? null;
  }

  register() {
    this.errorMsg = '';
    this.fieldErrors = {};

    if (this.form.sellerManagerPassword !== this.form.sellerManagerConfirmPassword) {
      this.fieldErrors['sellerManagerConfirmPassword'] = 'Passwords do not match';
      return;
    }

    this.isLoading = true;
    this.auth.registerSeller(this.form).subscribe({
      next: () => {
        this.isLoading = false;
        void this.router.navigate(['/confirm-email/seller'], {
          queryParams: { email: this.form.sellerManagerEmail.trim() }
        });
      },
      error: (e: Error) => {
        this.isLoading = false;
        const msg = e.message || 'Registration failed';
        // parse field errors زي "FieldName: message; FieldName2: message2"
        if (msg.includes(':')) {
          msg.split(';').forEach(part => {
            const [key, ...rest] = part.split(':');
            if (key && rest.length) {
              this.fieldErrors[key.trim()] = rest.join(':').trim();
            }
          });
          if (Object.keys(this.fieldErrors).length === 0) {
            this.errorMsg = msg;
          }
        } else {
          this.errorMsg = msg;
        }
      }
    });
  }
}
