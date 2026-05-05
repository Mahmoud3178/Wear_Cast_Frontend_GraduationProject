import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent implements OnInit {

  sidebarOpen = false;
  showLogoutModal = false;
  adminName = 'Administrator';
  adminInitials = 'A';
  currentPageTitle = 'Dashboard';

  // Map route segments to readable titles
  private readonly routeTitles: Record<string, string> = {
    'dashboard': 'Dashboard',
    'customers': 'Customers',
    'stores': 'Stores',
    'seller-applications': 'Seller Applications',
    'admins': 'Admins',
    'products': 'Products',
    'design-products': 'Design Products',
    'categories': 'Categories',
    'logos': 'Logos',
    'orders': 'Orders',
    'shipments': 'Shipments',
    'delivery-company': 'Delivery Company',
    'Factory': 'Factory',
    'add-logos': 'Add Logos',
    'templets': 'Templates',
    'users': 'Users',
    'reports': 'Reports',
  };

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadAdminInfo();
    this.updatePageTitle(this.router.url);

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.updatePageTitle(e.urlAfterRedirects || e.url);
      });
  }

  private loadAdminInfo(): void {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const part = token.split('.')[1];
      if (!part) return;
      const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '==='.slice((base64.length + 3) % 4);
      const payload = JSON.parse(atob(padded));

      const given = payload['given_name']
        ?? payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname']
        ?? '';
      const family = payload['family_name']
        ?? payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname']
        ?? '';

      if (given || family) {
        this.adminName = [given, family].filter(Boolean).join(' ');
      } else {
        const fullName = payload['name']
          ?? payload['unique_name']
          ?? payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
        if (typeof fullName === 'string' && fullName && !fullName.includes('@')) {
          this.adminName = fullName;
        } else {
          const email = payload['email']
            ?? payload['unique_name']
            ?? payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
          if (typeof email === 'string' && email.includes('@')) {
            this.adminName = email.split('@')[0];
          }
        }
      }

      const parts = this.adminName.trim().split(/\s+/);
      this.adminInitials = parts
        .slice(0, 2)
        .map(p => p[0]?.toUpperCase() ?? '')
        .join('');

    } catch {
      // keep defaults
    }
  }

  private updatePageTitle(url: string): void {
    const segments = url.split('/').filter(Boolean);
    const adminIdx = segments.indexOf('admin');
    const after = adminIdx >= 0 ? segments.slice(adminIdx + 1) : segments;
    for (let i = after.length - 1; i >= 0; i--) {
      const seg = after[i];
      if (this.routeTitles[seg]) {
        this.currentPageTitle = this.routeTitles[seg];
        return;
      }
    }
    this.currentPageTitle = 'Dashboard';
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar() {
    this.sidebarOpen = false;
  }

  confirmLogout() {
    this.showLogoutModal = true;
  }

  cancelLogout() {
    this.showLogoutModal = false;
  }

  logout() {
    this.showLogoutModal = false;
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('role');
    this.router.navigate(['/admin/login']);
  }
}
