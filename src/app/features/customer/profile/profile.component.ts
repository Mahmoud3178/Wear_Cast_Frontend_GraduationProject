import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CustomerNavComponent } from '../shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../shared/customer-footer/customer-footer.component';
import {
  AuthService,
  CustomerProfileSnapshot
} from '../../../core/services/auth.service';

type ProfileTab = 'info' | 'addresses' | 'payments' | 'orders' | 'notifications' | 'security';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
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

  constructor(private readonly auth: AuthService) {}

  ngOnInit(): void {
    this.auth.syncCustomerProfileFromCurrentToken();
    this.profile = this.auth.getCustomerProfile();
  }

  setTab(tab: ProfileTab): void {
    this.activeTab = tab;
  }

  get displayName(): string {
    const p = this.profile;
    if (!p) {
      return 'Guest';
    }
    const n = `${p.firstName} ${p.lastName}`.trim();
    if (n) {
      return n;
    }
    return p.email || 'Customer';
  }

  get avatarLetter(): string {
    const p = this.profile;
    if (p?.firstName?.trim()) {
      return p.firstName.trim().charAt(0).toUpperCase();
    }
    if (p?.email) {
      return p.email.charAt(0).toUpperCase();
    }
    return '?';
  }

  get hasAddress(): boolean {
    const p = this.profile;
    if (!p) {
      return false;
    }
    return !!(
      p.street?.trim() ||
      p.city?.trim() ||
      p.state?.trim() ||
      p.buildingNumber?.trim()
    );
  }
}
