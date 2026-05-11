import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-driver-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="sidebar h-100 d-flex flex-column" [class.collapsed]="isCollapsed">
      <!-- Sidebar Header -->
      <div class="sidebar-header p-4 d-flex align-items-center gap-3">
        <div class="logo-box bg-primary bg-gradient rounded-3 d-flex align-items-center justify-content-center shadow-lg" 
             style="min-width: 42px; height: 42px;">
          <i class="bi bi-truck text-white fs-4"></i>
        </div>
        <div class="brand-text" *ngIf="!isCollapsed">
          <h5 class="mb-0 fw-bold tracking-tight text-white">WearCast</h5>
          <span class="text-primary fw-medium text-xs text-uppercase tracking-wider">Driver Portal</span>
        </div>
      </div>

      <!-- Navigation Menu -->
      <nav class="sidebar-nav flex-grow-1 px-3 py-2 custom-scrollbar">
        <!-- Main Section -->
        <div class="nav-section mb-4">
          <p class="text-uppercase text-slate-500 fw-bold mb-2 px-3" 
             style="font-size: 0.65rem; letter-spacing: 0.1em;" *ngIf="!isCollapsed">Main Operations</p>
          <ul class="nav nav-pills flex-column gap-1">
            <li class="nav-item">
              <a class="nav-link d-flex align-items-center gap-3 px-3 py-2.5 rounded-3 transition-all" 
                 routerLink="dashboard" routerLinkActive="active" [title]="isCollapsed ? 'Dashboard' : ''">
                <div class="icon-wrapper d-flex align-items-center justify-content-center">
                  <i class="bi bi-grid-1x2-fill"></i>
                </div>
                <span class="fw-medium text-nowrap" *ngIf="!isCollapsed">Dashboard Overview</span>
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link d-flex align-items-center gap-3 px-3 py-2.5 rounded-3 transition-all" 
                 routerLink="shipments" routerLinkActive="active" [title]="isCollapsed ? 'Shipments' : ''">
                <div class="icon-wrapper d-flex align-items-center justify-content-center">
                  <i class="bi bi-box-seam-fill"></i>
                </div>
                <span class="fw-medium text-nowrap" *ngIf="!isCollapsed">My Shipments</span>
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link d-flex align-items-center gap-3 px-3 py-2.5 rounded-3 transition-all" 
                 [routerLink]="['shipments']" [queryParams]="{status: 'Delivered'}" routerLinkActive="active" [title]="isCollapsed ? 'History' : ''">
                <div class="icon-wrapper d-flex align-items-center justify-content-center">
                  <i class="bi bi-clock-history"></i>
                </div>
                <span class="fw-medium text-nowrap" *ngIf="!isCollapsed">Delivery History</span>
              </a>
            </li>
          </ul>
        </div>

        <!-- Management Section -->
        <div class="nav-section mb-4">
          <p class="text-uppercase text-slate-500 fw-bold mb-2 px-3" 
             style="font-size: 0.65rem; letter-spacing: 0.1em;" *ngIf="!isCollapsed">Settings & Account</p>
          <ul class="nav nav-pills flex-column gap-1">
            <li class="nav-item">
              <a class="nav-link d-flex align-items-center gap-3 px-3 py-2.5 rounded-3 transition-all" 
                 routerLink="profile" routerLinkActive="active" [title]="isCollapsed ? 'My Profile' : ''">
                <div class="icon-wrapper d-flex align-items-center justify-content-center">
                  <i class="bi bi-person-badge-fill"></i>
                </div>
                <span class="fw-medium text-nowrap" *ngIf="!isCollapsed">Driver Profile</span>
              </a>
            </li>
            <li class="nav-item mt-2">
              <a class="nav-link d-flex align-items-center gap-3 px-3 py-2.5 rounded-3 transition-all text-slate-400 logout-link" 
                 href="javascript:void(0)" (click)="logout()" [title]="isCollapsed ? 'Sign Out' : ''">
                 <div class="icon-wrapper d-flex align-items-center justify-content-center">
                   <i class="bi bi-box-arrow-left"></i>
                 </div>
                 <span class="fw-medium text-nowrap" *ngIf="!isCollapsed">Sign Out</span>
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <!-- Sidebar Footer -->
      <div class="sidebar-footer p-4" *ngIf="!isCollapsed">

      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      background-color: #0f172a; /* Slate 900 */
    }
    .sidebar {
      width: 100%;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      overflow-x: hidden;
      border-right: 1px solid rgba(255, 255, 255, 0.05);
      background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
    }
    .sidebar.collapsed {
      width: 80px;
    }
    .text-xs { font-size: 0.75rem; }
    .text-slate-400 { color: #94a3b8; }
    .text-slate-500 { color: #64748b; }
    .tracking-wider { letter-spacing: 0.05em; }
    .backdrop-blur { backdrop-filter: blur(8px); }
    .border-slate-700 { border-color: #334155 !important; }
    .bg-slate-800 { background-color: #1e293b !important; }

    .nav-link {
      color: #94a3b8;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.875rem;
      position: relative;
    }
    .icon-wrapper {
      width: 24px;
      height: 24px;
    }
    .nav-link i {
      font-size: 1.25rem;
      transition: transform 0.3s ease;
    }
    .nav-link:hover {
      color: #f8fafc;
      background-color: rgba(255, 255, 255, 0.05);
    }
    .nav-link:hover i {
      transform: translateX(3px);
    }
    .nav-link.active {
      color: #fff;
      background: linear-gradient(90deg, rgba(13, 110, 253, 0.15) 0%, rgba(13, 110, 253, 0.05) 100%);
      box-shadow: inset 3px 0 0 #0d6efd;
    }
    .nav-link.active i {
      color: #0d6efd;
    }
    .logout-link:hover {
      color: #ef4444 !important;
      background-color: rgba(239, 68, 68, 0.05);
    }
    .custom-scrollbar {
      overflow-y: auto;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
    }
    .shadow-primary {
      box-shadow: 0 4px 14px 0 rgba(13, 110, 253, 0.39);
    }
    .transition-all {
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .tracking-tight {
      letter-spacing: -0.025em;
    }
  `]
})
export class DriverSidebarComponent {
  @Input() isCollapsed = false;

  private authService = inject(AuthService);
  private router = inject(Router);

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
