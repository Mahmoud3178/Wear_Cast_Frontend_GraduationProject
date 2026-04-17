import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CustomerNavComponent } from '../shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../shared/customer-footer/customer-footer.component';
import {
  AuthService,
  CustomerProfileSnapshot
} from '../../../core/services/auth.service';

import { FormsModule } from '@angular/forms';
import { CustomerProfileService, UpdateCustomerRequest, ChangePasswordRequest } from '../../../core/services/customer-profile.service';

import { OrderService, Order } from '../../../core/services/order.service';

type ProfileTab = 'info' | 'addresses' | 'orders' | 'security';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    CustomerNavComponent,
    CustomerFooterComponent
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  activeTab: ProfileTab = 'info';

  /** Filled from registration + JWT after login. */
  profile: CustomerProfileSnapshot | null = null;

  loading = false;
  successMessage = '';
  errorMessage = '';

  profileImageUrl: string | null = null;

  editModeInfo = false;
  editModeAddress = false;

  // Orders
  orders: (Order & { itemsLoading?: boolean })[] = [];
  ordersLoading = false;
  expandedOrderId: number | null = null;

  infoForm = {
    firstName: '',
    lastName: '',
    phoneNumber: ''
  };

  addressForm = {
    country: '',
    state: '',
    city: '',
    street: '',
    buildingNumber: ''
  };

  passwordForm: ChangePasswordRequest = {
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  };

  constructor(
    private readonly auth: AuthService,
    private readonly profileService: CustomerProfileService,
    private readonly orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.auth.syncCustomerProfileFromCurrentToken();
    this.profile = this.auth.getCustomerProfile();
    this.loadProfileDetails();
  }

  loadProfileDetails(): void {
    this.profileService.getProfile().subscribe({
      next: (res) => {
        const data = res?.data ?? res;
        if (data) {
          this.infoForm = {
            firstName: data.firstName || this.profile?.firstName || '',
            lastName: data.lastName || this.profile?.lastName || '',
            phoneNumber: data.phoneNumber || this.profile?.phoneNumber || ''
          };

          this.profileImageUrl = data.profileImageUrl || data.ProfileImageUrl || data.imageUrl || data.ImageUrl || data.profileImage || data.ProfileImage || null;
          
          if (data.address) {
            this.addressForm = {
              country: data.address.country || '',
              state: data.address.state || '',
              city: data.address.city || '',
              street: data.address.street || '',
              buildingNumber: data.address.buildingNumber || ''
            };
          }
        }
      },
      error: (err) => console.error('Failed to load profile details', err)
    });
  }

  saveInfo(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    const payload: UpdateCustomerRequest = {
      ...this.infoForm,
      address: this.addressForm
    };

    this.profileService.updateProfile(payload).subscribe({
      next: () => {
        this.loading = false;
        this.editModeInfo = false;
        this.editModeAddress = false;
        this.successMessage = 'Profile updated successfully!';
        this.loadProfileDetails();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error?.description || 'Failed to update profile.';
      }
    });
  }

  updatePassword(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.profileService.changePassword(this.passwordForm).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Password changed successfully!';
        this.passwordForm = { currentPassword: '', newPassword: '', confirmNewPassword: '' };
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error?.description || 'Failed to change password.';
      }
    });
  }

  setTab(tab: ProfileTab): void {
    this.activeTab = tab;
    if (tab === 'orders' && this.orders.length === 0 && !this.ordersLoading) {
      this.loadOrders();
    }
  }

  loadOrders(): void {
    this.ordersLoading = true;
    this.orderService.getMyOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.ordersLoading = false;
      },
      error: () => {
        this.ordersLoading = false;
      }
    });
  }

  toggleOrderDetails(order: Order & { itemsLoading?: boolean }): void {
    if (this.expandedOrderId === order.orderId) {
      this.expandedOrderId = null;
      return;
    }
    this.expandedOrderId = order.orderId;
    // Items are already loaded in our mock from customer designs
  }

  getOrderBadgeClass(status: number): string {
    const map: Record<number, string> = {
      0: 'badge-warning',
      1: 'badge-info',
      2: 'badge-info',
      3: 'badge-primary',
      4: 'badge-success',
      5: 'badge-danger',
      6: 'badge-secondary'
    };
    return map[status] ?? 'badge-secondary';
  }

  get displayName(): string {
    const p = this.profile;
    if (!p) {
      return 'Guest';
    }
    const n = `${this.infoForm.firstName} ${this.infoForm.lastName}`.trim();
    if (n) {
      return n;
    }
    const o = `${p.firstName} ${p.lastName}`.trim();
    if (o) {
      return o;
    }
    return p.email || 'Customer';
  }

  get avatarLetter(): string {
    const p = this.profile;
    if (this.infoForm.firstName?.trim()) {
      return this.infoForm.firstName.trim().charAt(0).toUpperCase();
    }
    if (p?.firstName?.trim()) {
      return p.firstName.trim().charAt(0).toUpperCase();
    }
    if (p?.email) {
      return p.email.charAt(0).toUpperCase();
    }
    return '?';
  }

  get hasAddress(): boolean {
    const a = this.addressForm;
    return !!(
      a.street?.trim() ||
      a.city?.trim() ||
      a.state?.trim() ||
      a.buildingNumber?.trim()
    );
  }
}
