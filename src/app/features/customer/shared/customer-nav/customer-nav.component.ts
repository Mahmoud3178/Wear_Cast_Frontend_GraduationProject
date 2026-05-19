import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationsService } from '../../../../core/services/notifications.service';
import { NotificationsPollingService } from '../../../../core/services/notifications-polling.service';
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
  private countSub?: Subscription;
  private cartPollingInterval: any = null;

  private readonly onNotifDelivered = (): void => { this.pollingService.reset(); };
  private readonly onCartUpdated    = (): void => { this.loadCartCount(); };

  constructor(
    readonly auth: AuthService,
    private readonly router: Router,
    private readonly notifService: NotificationsService,
    private readonly pollingService: NotificationsPollingService,
    private readonly cartService: CartService,
    private readonly ngZone: NgZone
  ) {}

  ngOnInit(): void {
    // ابدأ الـ polling (لو مبدأتش قبل كده)
    this.pollingService.start();

    // اشترك في الـ count
    this.countSub = this.pollingService.count$.subscribe(count => {
      this.undeliveredCount = count;
    });

    this.loadCartCount();

    window.addEventListener('notif-delivered', this.onNotifDelivered);
    window.addEventListener('cart-updated',    this.onCartUpdated);

    this.ngZone.runOutsideAngular(() => {
      this.cartPollingInterval = setInterval(() => {
        this.ngZone.run(() => this.loadCartCount());
      }, 30000);
    });

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.closeMobileMenu();
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.countSub?.unsubscribe();
    if (this.cartPollingInterval) clearInterval(this.cartPollingInterval);
    window.removeEventListener('notif-delivered', this.onNotifDelivered);
    window.removeEventListener('cart-updated',    this.onCartUpdated);
    this.setBodyScrollLock(false);
    // مش بنعمل stop للـ polling عشان الـ service هتفضل شغالة
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
