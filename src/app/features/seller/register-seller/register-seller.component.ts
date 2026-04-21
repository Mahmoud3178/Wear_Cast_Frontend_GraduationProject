import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-register-seller',
  standalone: true,
  imports: [FormsModule, RouterLink, NgIf],
  templateUrl: './register-seller.component.html'
})
export class RegisterSellerComponent {
  showPassword = false;
  showConfirmPassword = false;

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
    this.form.sellerLogo = event.target.files[0];
  }

  register() {
    if (this.form.sellerManagerPassword !== this.form.sellerManagerConfirmPassword) {
      alert('Passwords do not match');
      return;
    }

    this.auth.registerSeller(this.form).subscribe({
      next: () => {
        void this.router.navigate(['/confirm-email/seller'], {
          queryParams: {
            email: this.form.sellerManagerEmail.trim()
          }
        });
      },
      error: (e: Error) => alert(e.message || 'Registration failed')
    });
  }
}
