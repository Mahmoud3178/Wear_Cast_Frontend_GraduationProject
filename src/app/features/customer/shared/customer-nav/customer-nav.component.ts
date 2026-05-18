import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationsService } from '../../../../core/services/notifications.service';

@Component({
  selector: 'app-customer-nav',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './customer-nav.component.html',
  styleUrl: './customer-nav.component.css'
})
export class CustomerNavComponent implements OnInit, OnDestroy {
  searchTerm = '';
  isMobileMenuOpen = false;
  undeliveredCount = 0;
  private routerSub?: Subscription;
  private readonly onNotifDelivered = (): void => {
    this.undeliveredCount = 0;
  };

  constructor(
    readonly auth: AuthService,
    private readonly router: Router,
    private readonly notifService: NotificationsService
  ) {}

  ngOnInit(): void {
    this.loadUndeliveredCount();
    window.addEventListener('notif-delivered', this.onNotifDelivered);

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.closeMobileMenu();
        const url = e.urlAfterRedirects || e.url;
        if (url.includes('/customer/notifications')) {
          setTimeout(() => this.loadUndeliveredCount(), 500);
        }
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    window.removeEventListener('notif-delivered', this.onNotifDelivered);
    this.setBodyScrollLock(false);
  }

  loadUndeliveredCount(): void {
    if (!this.auth.isLoggedIn()) {
      this.undeliveredCount = 0;
      return;
    }
    this.notifService.getUndeliveredCount().subscribe({
      next: (res) => {
        this.undeliveredCount = this.notifService.parseUndeliveredCount(res);
      },
      error: () => {
        this.undeliveredCount = 0;
      }
    });
  }

  signOut(): void {
    this.auth.logout();
  }

  runSearch(): void {
    const q = this.searchTerm.trim();
    this.router.navigate(['/customer/category'], {
      queryParams: q ? { q } : {}
    });
    this.isMobileMenuOpen = false;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    this.setBodyScrollLock(this.isMobileMenuOpen);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    this.setBodyScrollLock(false);
  }

  private setBodyScrollLock(locked: boolean): void {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = locked ? 'hidden' : '';
  }
}

