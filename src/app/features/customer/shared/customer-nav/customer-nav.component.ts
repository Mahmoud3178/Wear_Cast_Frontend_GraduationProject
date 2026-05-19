import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationsService } from '../../../../core/services/notifications.service';
import { NotificationsPollingService } from '../../../../core/services/notifications-polling.service';
import {
  CartService,
  CART_UPDATED_EVENT,
  MyCartResponse
} from '../../../../core/services/cart.service';

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
  private readonly onCartUpdated = (e: Event): void => {
    const cart = (e as CustomEvent<MyCartResponse | null>).detail;
    if (cart) {
      this.cartCount = this.cartService.getCartItemCount(cart);
      return;
    }
    this.loadCartCount(true);
  };

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
    window.addEventListener(CART_UPDATED_EVENT, this.onCartUpdated);

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
    window.removeEventListener(CART_UPDATED_EVENT, this.onCartUpdated);
    this.setBodyScrollLock(false);
    // مش بنعمل stop للـ polling عشان الـ service هتفضل شغالة
  }

  loadCartCount(forceRefresh = false): void {
    if (!this.auth.isLoggedIn()) {
      this.cartCount = 0;
      return;
    }
    this.cartService.getMyCart(forceRefresh).subscribe({
      next: cart => {
        this.cartCount = this.cartService.getCartItemCount(cart);
      },
      error: () => {
        this.cartCount = 0;
      }
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
