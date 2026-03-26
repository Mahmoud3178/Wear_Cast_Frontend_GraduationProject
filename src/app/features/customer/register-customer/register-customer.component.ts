import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register-customer',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './register-customer.component.html'
})
export class RegisterCustomerComponent {

  form = {
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    profileImage: null as File | null,
    state: '',
    city: '',
    street: '',
    buildingNumber: ''
  };

  constructor(private auth: AuthService, private router: Router) {}

  onFileChange(event: any) {
    this.form.profileImage = event.target.files[0];
  }

  register() {
    if (this.form.password !== this.form.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    this.auth.registerCustomer(this.form).subscribe(res => {
      alert('Registered Successfully');
      this.router.navigate(['/login']);
    });
  }
}
