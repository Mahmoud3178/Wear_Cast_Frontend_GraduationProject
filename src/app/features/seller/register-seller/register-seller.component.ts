import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register-seller',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './register-seller.component.html'
})
export class RegisterSellerComponent {

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

    this.auth.registerSeller(this.form).subscribe(res => {
      alert('Seller Registered Successfully');
      this.router.navigate(['/login']);
    });
  }
}
