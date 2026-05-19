import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationsService } from '../../../../core/services/notifications.service';
import { CartService } from '../../../../core/services/cart.service';

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
  cartCount = 0;

  private routerSub?: Subscription;
  private notifPollingInterval: any = null;
  private cartPollingInterval: any = null;

  private readonly onNotifDelivered = (): void => { this.undeliveredCount = 0; };
  private readonly onNotifAllRead   = (): void => { this.undeliveredCount = 0; };
  private readonly onNotifRead      = (): void => { this.loadUndeliveredCount(); };
  private readonly onCartUpdated    = (): void => { this.loadCartCount(); };

  constructor(
    readonly auth: AuthService,
    private readonly router: Router,
    private readonly notifService: NotificationsService,
    private readonly cartService: CartService,
    private readonly ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadUndeliveredCount();
    this.loadCartCount();

    window.addEventListener('notif-delivered', this.onNotifDelivered);
    window.addEventListener('notif-all-read',  this.onNotifAllRead);
    window.addEventListener('notif-read',      this.onNotifRead);
    window.addEventListener('cart-updated',    this.onCartUpdated);

    this.ngZone.runOutsideAngular(() => {
      // polling النوتفكيشن كل 10 ثواني
      this.notifPollingInterval = setInterval(() => {
        this.ngZone.run(() => this.loadUndeliveredCount());
      }, 10000);

      // polling الكارت كل 30 ثانية (أبطأ عشان مش بيتغير كتير)
      this.cartPollingInterval = setInterval(() => {
        this.ngZone.run(() => this.loadCartCount());
      }, 30000);
    });

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.closeMobileMenu();
        const url = e.urlAfterRedirects || e.url;
        if (url.includes('/customer/notifications')) {
          setTimeout(() => this.loadUndeliveredCount(), 600);
        }
        if (url.includes('/customer/cart')) {
          setTimeout(() => this.loadCartCount(), 500);
        }
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    if (this.notifPollingInterval) clearInterval(this.notifPollingInterval);
    if (this.cartPollingInterval)  clearInterval(this.cartPollingInterval);
    window.removeEventListener('notif-delivered', this.onNotifDelivered);
    window.removeEventListener('notif-all-read',  this.onNotifAllRead);
    window.removeEventListener('notif-read',      this.onNotifRead);
    window.removeEventListener('cart-updated',    this.onCartUpdated);
    this.setBodyScrollLock(false);
  }

  loadUndeliveredCount(): void {
    if (!this.auth.isLoggedIn()) { this.undeliveredCount = 0; return; }
    this.notifService.getUndeliveredCount().subscribe({
      next: (res) => { this.undeliveredCount = this.notifService.parseUndeliveredCount(res); },
      error: () => {}
    });
  }

  loadCartCount(): void {
    if (!this.auth.isLoggedIn()) { this.cartCount = 0; return; }
    this.cartService.getFixedItems().subscribe({
      next: (fixed: any[]) => {
        this.cartService.getDesignItems().subscribe({
          next: (designs: any[]) => {
            const fixedQty = (fixed ?? []).reduce((sum: number, f: any) => {
              const sizes = Array.isArray(f.sizes ?? f.Sizes) ? (f.sizes ?? f.Sizes) : [];
              return sum + (sizes.length
                ? sizes.reduce((s: number, sz: any) => s + (sz.quantityInCart ?? sz.QuantityInCart ?? sz.quantity ?? 0), 0)
                : (f.quantity ?? f.Quantity ?? 1));
            }, 0);
            const designQty = (designs ?? []).reduce((sum: number, d: any) => {
              const sizes = Array.isArray(d.sizes ?? d.Sizes) ? (d.sizes ?? d.Sizes) : [];
              return sum + (sizes.length
                ? sizes.reduce((s: number, sz: any) => s + (sz.quantityInCart ?? sz.QuantityInCart ?? sz.quantity ?? 0), 0)
                : (d.quantity ?? d.Quantity ?? 1));
            }, 0);
            this.cartCount = fixedQty + designQty;
          },
          error: () => {}
        });
      },
      error: () => {}
    });
  }

  signOut(): void { this.auth.logout(); }

  runSearch(): void {
    const q = this.searchTerm.trim();
    this.router.navigate(['/customer/category'], { queryParams: q ? { q } : {} });
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
