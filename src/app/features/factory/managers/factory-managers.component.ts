import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  FactoryApiService,
  type FactoryManager
} from '../../../core/services/factory-api.service';
import { AuthService } from '../../../core/services/auth.service';

interface ManagerFormData {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-factory-managers',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, RouterLink],
  templateUrl: './factory-managers.component.html'
})
export class FactoryManagersComponent implements OnInit {
  form: ManagerFormData = {
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  };

  submitting = false;
  errorMsg = '';
  successMsg = '';

  /** Track the last created manager's email and userId for confirmation link. */
  lastCreatedEmail = '';
  lastCreatedUserId = '';

  /** Track managers created in this session for quick reference. */
  createdManagers: { email: string; name: string }[] = [];

  showPassword = false;
  showConfirm = false;

  managers: FactoryManager[] = [];
  loadingManagers = false;
  managersLoadError = '';

  constructor(
    private readonly factoryApi: FactoryApiService,
    private readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadManagers();
  }

  loadManagers(): void {
    this.loadingManagers = true;
    this.managersLoadError = '';
    this.factoryApi.getAllFactoryManagers().subscribe({
      next: rows => {
        this.managers = rows;
        this.loadingManagers = false;
      },
      error: () => {
        this.managersLoadError = 'Could not load managers.';
        this.loadingManagers = false;
      }
    });
  }

  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleShowConfirm(): void {
    this.showConfirm = !this.showConfirm;
  }

  onSubmit(): void {
    this.errorMsg = '';
    this.successMsg = '';

    // Basic client-side validation
    if (!this.form.email?.trim()) {
      this.errorMsg = 'Email is required.';
      return;
    }
    if (!this.form.firstName?.trim()) {
      this.errorMsg = 'First name is required.';
      return;
    }
    if (!this.form.lastName?.trim()) {
      this.errorMsg = 'Last name is required.';
      return;
    }
    if (!this.form.phoneNumber?.trim()) {
      this.errorMsg = 'Phone number is required.';
      return;
    }
    if (!this.form.password) {
      this.errorMsg = 'Password is required.';
      return;
    }
    if (this.form.password.length < 6) {
      this.errorMsg = 'Password must be at least 6 characters.';
      return;
    }
    if (this.form.password !== this.form.confirmPassword) {
      this.errorMsg = 'Passwords do not match.';
      return;
    }

    this.submitting = true;

    const factoryId = this.auth.getFactoryId() ?? undefined;

    this.factoryApi
      .createFactoryManager({
        email: this.form.email.trim(),
        firstName: this.form.firstName.trim(),
        lastName: this.form.lastName.trim(),
        phoneNumber: this.form.phoneNumber.trim(),
        password: this.form.password,
        confirmPassword: this.form.confirmPassword,
        providedFactoryId: factoryId
      })
      .subscribe({
        next: (res) => {
          this.submitting = false;
          this.successMsg =
            res.message || 'Factory manager created successfully!';
          this.lastCreatedEmail = this.form.email.trim();
          this.lastCreatedUserId = res.userId || '';
          this.loadManagers();
          this.createdManagers.push({
            email: this.form.email.trim(),
            name: `${this.form.firstName.trim()} ${this.form.lastName.trim()}`
          });
          // Reset form
          this.form = {
            email: '',
            firstName: '',
            lastName: '',
            phoneNumber: '',
            password: '',
            confirmPassword: ''
          };
        },
        error: (err: Error) => {
          this.submitting = false;
          this.errorMsg =
            err.message || 'Failed to create factory manager. Please try again.';
        }
      });
  }
}
