import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HandelAdminsForAdminService } from '../../../core/services/handel-admins-for-admin.service';

@Component({
  selector: 'app-add-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-admin.component.html',
  styleUrl: './add-admin.component.css'
})
export class AddAdminComponent {

  constructor(private adminService: HandelAdminsForAdminService) {}

  admin = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    password: '',
    confirmPassword: ''
  };

  showPassword = false;
  showConfirmPassword = false;

  errorMessages: string[] = [];
  successMessage = '';

  fieldErrors: any = {};

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  submit() {

    this.errorMessages = [];
    this.successMessage = '';
    this.fieldErrors = {};

    this.adminService.addAdmin(this.admin).subscribe({

      next: () => {

        this.successMessage = 'Admin added successfully!';

        this.admin = {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          role: '',
          password: '',
          confirmPassword: ''
        };
      },

      error: (err) => {
        this.handleError(err);
      }

    });
  }

handleError(err: any) {
  this.errorMessages = [];
  this.fieldErrors = {};

  const error = err?.error;

  if (error?.validationErrors) {
    this.fieldErrors = error.validationErrors;
    for (const key of Object.keys(error.validationErrors)) {
      this.errorMessages.push(`${key}: ${error.validationErrors[key]}`);
    }
  } else if (error?.errors) {
    this.fieldErrors = error.errors;
    for (const key of Object.keys(error.errors)) {
      this.errorMessages.push(...error.errors[key]);
    }
  } else if (error?.message) {
    this.errorMessages = [error.message];
  } else if (error?.description) {
    this.errorMessages = [error.description];
  } else {
    this.errorMessages = ['Something went wrong. Please try again.'];
  }
}
}
