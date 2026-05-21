import { Component, inject, OnInit, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { Router, RouterLink, RouterModule } from '@angular/router';

@Component({
  selector: 'app-driver-header',
  standalone: true,
  imports: [CommonModule, RouterModule,RouterLink],
  template: `
    <header class="shipping-header d-flex align-items-center justify-content-between px-4 py-2 border-bottom shadow-sm sticky-top">
      <div class="d-flex align-items-center flex-grow-1">
        <!-- Hamburger Button -->
        <button class="btn-icon p-2 rounded-circle hover-bg-slate transition-all border-0 bg-transparent d-lg-none me-2" (click)="toggleSidebar.emit()">
          <i class="bi bi-list fs-4 text-slate-600"></i>
        </button>
        <!-- Search Bar -->
        <!--<div class="search-container position-relative d-none d-lg-block">
          <div class="search-bar d-flex align-items-center px-3 py-2 rounded-4 border transition-all"
               [class.focused]="isSearchFocused">
            <i class="bi bi-search text-slate-400 me-2"></i>
            <input type="text"
                   (focus)="isSearchFocused = true"
                   (blur)="isSearchFocused = false"
                   class="form-control border-0 bg-transparent shadow-none p-0 text-sm"
                   placeholder="Search shipments, orders, drivers...">
            <span class="search-shortcut ms-2 px-1.5 py-0.5 rounded-2 border bg-light text-slate-400 d-flex align-items-center">
              <i class="bi bi-command small me-1"></i>K
            </span>
          </div>
        </div>-->
      </div>

      <div class="d-flex align-items-center gap-2 gap-md-3">
        <!-- Quick Stats (Optional) -->
        <!-- <div class="d-none d-xl-flex align-items-center gap-4 me-4">
          <div class="stat-item">
            <span class="text-slate-500 text-xs fw-bold text-uppercase d-block mb-0">Active Shipments</span>
            <span class="text-dark fw-bold h6 mb-0">{{ stats?.pendingDeliveries || 0 }}</span>
          </div>
          <div class="stat-item border-start ps-4">
            <span class="text-slate-500 text-xs fw-bold text-uppercase d-block mb-0">Online Drivers</span>
            <span class="text-success fw-bold h6 mb-0">{{ stats?.activeDrivers || 0 }}</span>
          </div>
        </div> -->

        <div class="header-action-btns d-flex align-items-center gap-2">
      <a routerLink="/driver/notifications" class="notif-bell-btn me-3" style="position:relative; text-decoration:none;">
        <i class="bi bi-bell-fill" style="font-size:20px; color:#555;"></i>
        <span *ngIf="undeliveredCount > 0"
              style="position:absolute; top:-6px; right:-6px; background:#ef4444; color:#fff;
                     border-radius:50%; font-size:11px; min-width:18px; height:18px;
                     display:flex; align-items:center; justify-content:center; padding:0 3px;">
          {{ undeliveredCount > 99 ? '99+' : undeliveredCount }}
        </span>
      </a>
        </div>

        <div class="v-divider mx-2"></div>

        <!-- User Dropdown -->
        <div class="user-dropdown dropdown">
          <div class="user-trigger d-flex align-items-center gap-2 cursor-pointer p-1 rounded-pill hover-bg-slate transition-all dropdown-toggle"
               data-bs-toggle="dropdown" aria-expanded="false">
            <div class="avatar-box shadow-sm border border-2 border-white">
              <div class="avatar-gradient d-flex align-items-center justify-content-center fw-bold text-white">
                {{ userName.charAt(0) || 'D' }}
              </div>
            </div>
            <div class="d-none d-md-block text-start pe-2">
              <p class="mb-0 fw-bold text-sm text-dark leading-tight">{{ userName }}</p>
              <div class="d-flex align-items-center gap-1">
                <span class="status-dot bg-success"></span>
                <span class="text-slate-500 fw-medium uppercase-tracking">{{ userRole }}</span>
              </div>
            </div>
            <i class="bi bi-chevron-down text-slate-400 small me-1"></i>
          </div>

          <ul class="dropdown-menu dropdown-menu-end border-0 shadow-premium p-2 mt-2 animate-slide-in">
            <li><h6 class="dropdown-header text-uppercase text-xs fw-bold text-slate-500 py-2">Account Control</h6></li>
            <li>
              <a class="dropdown-item d-flex align-items-center gap-3 py-2.5 rounded-3" routerLink="profile">
                <div class="dropdown-icon bg-primary-soft text-primary">
                  <i class="bi bi-person-circle"></i>
                </div>
                <div class="dropdown-text">
                  <p class="mb-0 fw-bold">My Profile</p>
                  <p class="mb-0 text-xs text-slate-500">Settings and personal info</p>
                </div>
              </a>
            </li>

            <li><hr class="dropdown-divider opacity-50 mx-2"></li>
            <li>
              <a class="dropdown-item d-flex align-items-center gap-3 py-2.5 rounded-3 text-danger" href="javascript:void(0)" (click)="logout()">
                <div class="dropdown-icon bg-danger-soft text-danger">
                  <i class="bi bi-box-arrow-right"></i>
                </div>
                <div class="dropdown-text">
                  <p class="mb-0 fw-bold">Sign Out</p>
                  <p class="mb-0 text-xs text-danger-soft">Logout from session</p>
                </div>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .shipping-header {
      height: 70px;
      z-index: 1000;
      background: rgba(255, 255, 255, 0.8) !important;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .text-sm { font-size: 0.875rem; }
    .text-xs { font-size: 0.75rem; }
    .text-slate-400 { color: #94a3b8; }
    .text-slate-500 { color: #64748b; }
    .text-slate-600 { color: #475569; }
    .bg-primary-soft { background-color: rgba(13, 110, 253, 0.1); }
    .bg-danger-soft { background-color: rgba(239, 68, 68, 0.1); }
    .text-danger-soft { color: rgba(239, 68, 68, 0.7); }

    .v-divider {
      width: 1px;
      height: 32px;
      background-color: #e2e8f0;
    }

    .hover-bg-slate:hover { background-color: #f1f5f9; }

    .avatar-box {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      overflow: hidden;
    }
    .avatar-gradient {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #0d6efd 0%, #6610f2 100%);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .uppercase-tracking {
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: 0.65rem;
    }

    .badge-count {
      position: absolute;
      top: 4px;
      right: 4px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: 8px;
      color: white;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      border: 2px solid white;
    }

    .shadow-premium {
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }

    .dropdown-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
    }

    .dropdown-item {
      transition: all 0.2s ease;
    }
    .dropdown-item:active {
      background-color: #f1f5f9;
      color: inherit;
    }

    .animate-slide-in {
      animation: slideIn 0.2s ease-out;
    }
    @keyframes slideIn {
      from { transform: translateY(10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .cursor-pointer { cursor: pointer; }
    .dropdown-toggle::after { display: none; }
  `]
})
export class DriverHeaderComponent implements OnInit {
  @Output() toggleSidebar = new EventEmitter<void>();
@Input() undeliveredCount = 0;

  private authService = inject(AuthService);
  private router = inject(Router);

  userName = 'Driver';
  userRole = 'Driver';
  isSearchFocused = false;

 ngOnInit(): void {
  const role = this.authService.getRole();
  if (role) this.userRole = role;

  const profile = this.authService.getCustomerProfile();
  if (profile && profile.firstName) {
    this.userName = `${profile.firstName} ${profile.lastName}`.trim();
  }

  // ✅ استمع للكونتر
  window.addEventListener('notif-count-update', (e: any) => {
    this.undeliveredCount = e.detail.count;
  });

  window.addEventListener('notif-delivered', () => {
    this.undeliveredCount = 0;
  });
}

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
