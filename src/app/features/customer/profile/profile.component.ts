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

import {
  CustomerShipmentsService,
  CustomerShipmentRow,
  CustomerShipmentListQuery,
  CustomerShipmentDetailVm,
  CUSTOMER_SHIPMENT_SORT_OPTIONS,
  CUSTOMER_SHIPMENT_STATUS_OPTIONS
} from '../../../core/services/customer-shipments.service';

type ProfileTab = 'info' | 'addresses' | 'orders' | 'wallet' | 'security';

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
  imageUploading = false;
  imageDeleting = false;

  walletBalance: number | null = null;
  walletLoading = false;
  walletLoadedOnce = false;
  walletError = '';

  editModeInfo = false;
  editModeAddress = false;

  /** Numeric customer id from GET /api/customers/profile (for CustomerId query when required). */
  customerNumericId: number | null = null;

  /** Shipments (GET /api/CustomerShipments) */
  shipments: CustomerShipmentRow[] = [];
  shipmentsLoading = false;
  shipmentsError = '';
  shipmentPageIndex = 1;
  shipmentPageSize = 10;
  shipmentPages = 1;
  shipmentRecords = 0;
  shipmentsLoadedOnce = false;

  shipmentFilters: {
    sortBy: number | null;
    shipmentStatus: number | null;
    minPrice: string;
    maxPrice: string;
    deliveryCity: string;
    deliveryStreet: string;
  } = {
    sortBy: null,
    shipmentStatus: null,
    minPrice: '',
    maxPrice: '',
    deliveryCity: '',
    deliveryStreet: ''
  };

  readonly shipmentSortOptions = CUSTOMER_SHIPMENT_SORT_OPTIONS;
  readonly shipmentStatusOptions = CUSTOMER_SHIPMENT_STATUS_OPTIONS;

  expandedShipmentId: number | null = null;
  shipmentDetailLoading = false;
  shipmentDetail: CustomerShipmentDetailVm | null = null;
  selectedOrderLine: CustomerShipmentDetailVm['orderLines'][number] | null = null;
  selectedOrderGalleryIndex = 0;

  infoForm = {
    firstName: '',
    lastName: '',
    phoneNumber: ''
  };

  addressForm = {
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
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(
    private readonly auth: AuthService,
    private readonly profileService: CustomerProfileService,
    private readonly customerShipmentsService: CustomerShipmentsService
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
          const hadCustomerId = this.customerNumericId != null;
          const cid =
            data.id ??
            data.Id ??
            data.customerId ??
            data.CustomerId ??
            data.userId ??
            data.UserId;
          if (typeof cid === 'number' && cid > 0) {
            this.customerNumericId = cid;
          } else if (typeof cid === 'string' && /^\d+$/.test(cid)) {
            this.customerNumericId = parseInt(cid, 10);
          }
          if (
            this.activeTab === 'orders' &&
            !hadCustomerId &&
            this.customerNumericId != null &&
            this.shipmentsLoadedOnce
          ) {
            this.loadShipments(false);
          }
          this.infoForm = {
            firstName: data.firstName || this.profile?.firstName || '',
            lastName: data.lastName || this.profile?.lastName || '',
            phoneNumber: data.phoneNumber || this.profile?.phoneNumber || ''
          };

          this.profileImageUrl =
            data.profileImageUrl ||
            data.ProfileImageUrl ||
            data.imageUrl ||
            data.ImageUrl ||
            data.imageurl ||
            data.Imageurl ||
            data.profileImage ||
            data.ProfileImage ||
            null;
          
          if (data.address) {
            this.addressForm = {
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
        let msg = err.error?.error?.description || err.error?.message;
        const validationErrors = err.error?.validationErrors || err.error?.ValidationErrors;
        if (validationErrors) {
          msg = Object.values(validationErrors).flat().join(' ');
        }
        this.errorMessage = msg || 'Failed to change password.';
      }
    });
  }

  setTab(tab: ProfileTab): void {
    this.activeTab = tab;
    if (tab === 'orders' && !this.shipmentsLoadedOnce && !this.shipmentsLoading) {
      this.loadShipments(true);
    }
    if (tab === 'wallet' && !this.walletLoadedOnce && !this.walletLoading) {
      this.loadWallet();
    }
  }

  onProfileImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.imageUploading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.profileService.updateProfileImage(file, this.customerNumericId).subscribe({
      next: () => {
        this.imageUploading = false;
        this.successMessage = 'Profile image updated successfully!';
        this.loadProfileDetails();
        setTimeout(() => (this.successMessage = ''), 3000);
      },
      error: (err) => {
        this.imageUploading = false;
        this.errorMessage =
          err?.error?.error?.description ||
          err?.error?.message ||
          'Failed to update profile image.';
      }
    });
    input.value = '';
  }

  deleteProfileImage(): void {
    if (!this.profileImageUrl || this.imageDeleting) return;
    this.imageDeleting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.profileService.deleteProfileImage(this.customerNumericId).subscribe({
      next: () => {
        this.imageDeleting = false;
        this.profileImageUrl = null;
        this.successMessage = 'Profile image deleted successfully!';
        setTimeout(() => (this.successMessage = ''), 3000);
      },
      error: (err) => {
        this.imageDeleting = false;
        this.errorMessage =
          err?.error?.error?.description ||
          err?.error?.message ||
          'Failed to delete profile image.';
      }
    });
  }

  loadWallet(): void {
    this.walletLoading = true;
    this.walletError = '';
    this.profileService.getWallet().subscribe({
      next: (res) => {
        const data = res?.data ?? res;
        const rawBalance = data?.balance ?? data?.Balance;
        if (typeof rawBalance === 'number') {
          this.walletBalance = rawBalance;
        } else if (typeof rawBalance === 'string' && /^-?\d+(\.\d+)?$/.test(rawBalance)) {
          this.walletBalance = parseFloat(rawBalance);
        } else {
          this.walletBalance = null;
        }
        this.walletLoading = false;
        this.walletLoadedOnce = true;
      },
      error: () => {
        this.walletLoading = false;
        this.walletLoadedOnce = true;
        this.walletError = 'Could not load wallet balance. Please try again.';
      }
    });
  }

  loadShipments(resetPage: boolean): void {
    if (resetPage) this.shipmentPageIndex = 1;
    this.shipmentsLoading = true;
    this.shipmentsError = '';
    const q: CustomerShipmentListQuery = {
      customerId: this.customerNumericId,
      pageIndex: this.shipmentPageIndex,
      pageSize: this.shipmentPageSize,
      sortBy: this.shipmentFilters.sortBy,
      shipmentStatus: this.shipmentFilters.shipmentStatus,
      deliveryCity: this.shipmentFilters.deliveryCity.trim() || null,
      deliveryStreet: this.shipmentFilters.deliveryStreet.trim() || null
    };
    const minP = parseFloat(this.shipmentFilters.minPrice);
    if (!isNaN(minP) && minP > 0) q.minPrice = minP;
    const maxP = parseFloat(this.shipmentFilters.maxPrice);
    if (!isNaN(maxP) && maxP > 0) q.maxPrice = maxP;

    this.customerShipmentsService.list(q).subscribe({
      next: (page) => {
        this.shipments = page.items;
        this.shipmentPages = Math.max(1, page.pages || 1);
        this.shipmentRecords = page.records;
        this.shipmentPageIndex = page.pageIndex;
        this.shipmentPageSize = page.pageSize;
        this.shipmentsLoading = false;
        this.shipmentsLoadedOnce = true;
        this.expandedShipmentId = null;
        this.shipmentDetail = null;
      },
      error: () => {
        this.shipmentsLoading = false;
        this.shipmentsError = 'Could not load shipments. Please try again.';
        this.shipmentsLoadedOnce = true;
      }
    });
  }

  applyShipmentFilters(): void {
    this.loadShipments(true);
  }

  resetShipmentFilters(): void {
    this.shipmentFilters = {
      sortBy: null,
      shipmentStatus: null,
      minPrice: '',
      maxPrice: '',
      deliveryCity: '',
      deliveryStreet: ''
    };
    this.loadShipments(true);
  }

  changeShipmentPage(delta: number): void {
    const next = this.shipmentPageIndex + delta;
    if (next < 1 || next > this.shipmentPages) return;
    this.shipmentPageIndex = next;
    this.loadShipments(false);
  }

  toggleShipmentDetails(row: CustomerShipmentRow): void {
    if (this.expandedShipmentId === row.id) {
      this.expandedShipmentId = null;
      this.shipmentDetail = null;
      return;
    }
    this.expandedShipmentId = row.id;
    this.shipmentDetail = null;
    this.shipmentDetailLoading = true;
    this.customerShipmentsService.getShipmentDetailWithItems(row.id, row).subscribe({
      next: (detail) => {
        this.shipmentDetailLoading = false;
        this.shipmentDetail = detail;
      },
      error: () => {
        this.shipmentDetailLoading = false;
        this.shipmentDetail = null;
      }
    });
  }

  getShipmentBadgeClass(status: number | null): string {
    if (status == null) return 'badge-secondary';
    const map: Record<number, string> = {
      1: 'badge-warning',
      2: 'badge-warning',
      3: 'badge-info',
      4: 'badge-primary',
      5: 'badge-primary',
      6: 'badge-success'
    };
    return map[status] ?? 'badge-secondary';
  }

  shipmentStatusLabel(status: number | null): string {
    if (status == null) return '—';
    const found = this.shipmentStatusOptions.find(o => o.value === status);
    return found?.label ?? `Status ${status}`;
  }

  isStepCompleted(stepIndex: number, status: number | null): boolean {
    if (status == null) return false;
    switch (stepIndex) {
      case 0: return status >= 1; // Ordered
      case 1: return status >= 2; // Ready for pickup (Unassigned/Assigned/PickingUp...)
      case 2: return status >= 4; // Trip started (PickingUp/OutForDelivery...)
      case 3: return status >= 5; // Out for delivery (OutForDelivery/Delivered)
      case 4: return status >= 6; // Delivered
      default: return false;
    }
  }

  isStepActive(stepIndex: number, status: number | null): boolean {
    if (status == null) return false;
    switch (status) {
      case 1:
        return stepIndex === 0;
      case 2:
      case 3:
        return stepIndex === 1;
      case 4:
        return stepIndex === 2;
      case 5:
        return stepIndex === 3;
      case 6:
        return stepIndex === 4;
      default:
        return false;
    }
  }

  formatSizeLabel(size: string): string {
    if (!size?.trim()) return '';
    return size.trim().replace(/^_/, '');
  }

  parseSizeDetails(sizeStr: string, totalQty: number): { size: string; quantity: number }[] {
    if (!sizeStr || sizeStr.trim() === '-' || sizeStr.trim() === '') return [];
    
    if (sizeStr.includes(',')) {
      return sizeStr.split(',').map(part => {
        const trimmed = part.trim();
        const match = trimmed.match(/^(.+?)\s*x\s*(\d+)$/i);
        if (match) {
          return {
            size: match[1].replace(/^_/, '').trim(),
            quantity: parseInt(match[2], 10)
          };
        } else {
          return {
            size: trimmed.replace(/^_/, '').trim(),
            quantity: 1
          };
        }
      });
    }

    const trimmed = sizeStr.trim();
    const match = trimmed.match(/^(.+?)\s*x\s*(\d+)$/i);
    if (match) {
      return [{
        size: match[1].replace(/^_/, '').trim(),
        quantity: parseInt(match[2], 10)
      }];
    } else {
      return [{
        size: trimmed.replace(/^_/, '').trim(),
        quantity: totalQty || 1
      }];
    }
  }

  openShipmentItem(line: CustomerShipmentDetailVm['orderLines'][number]): void {
    this.selectedOrderLine = line;
    this.selectedOrderGalleryIndex = 0;
  }

  closeShipmentItemModal(): void {
    this.selectedOrderLine = null;
    this.selectedOrderGalleryIndex = 0;
  }

  nextOrderImage(): void {
    const total = this.selectedOrderLine?.galleryImageUrls.length ?? 0;
    if (total <= 1) return;
    this.selectedOrderGalleryIndex = (this.selectedOrderGalleryIndex + 1) % total;
  }

  prevOrderImage(): void {
    const total = this.selectedOrderLine?.galleryImageUrls.length ?? 0;
    if (total <= 1) return;
    this.selectedOrderGalleryIndex =
      (this.selectedOrderGalleryIndex - 1 + total) % total;
  }

  get selectedOrderImageUrl(): string | null {
    if (!this.selectedOrderLine?.galleryImageUrls.length) return null;
    return this.selectedOrderLine.galleryImageUrls[
      Math.max(
        0,
        Math.min(
          this.selectedOrderGalleryIndex,
          this.selectedOrderLine.galleryImageUrls.length - 1
        )
      )
    ];
  }

  setOrderImage(index: number): void {
    const total = this.selectedOrderLine?.galleryImageUrls.length ?? 0;
    if (index < 0 || index >= total) return;
    this.selectedOrderGalleryIndex = index;
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
