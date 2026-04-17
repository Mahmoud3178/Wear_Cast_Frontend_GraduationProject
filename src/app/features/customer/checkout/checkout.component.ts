import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CustomerNavComponent } from '../shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../shared/customer-footer/customer-footer.component';
import { CheckoutService, ShippingInfoDto } from '../../../core/services/checkout.service';
import { CartService, CartFixedItem, CartDesignItem } from '../../../core/services/cart.service';

declare const Stripe: any;

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CustomerNavComponent, CustomerFooterComponent],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class CheckoutComponent implements OnInit {
  loading = signal(true);
  submitting = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  cartItems = signal<any[]>([]);

  readonly DELIVERY_FEE = 15;
  readonly DISCOUNT_RATE = 0.20;

  subtotal = computed(() =>
    this.cartItems().reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0)
  );
  discount = computed(() => this.subtotal() * this.DISCOUNT_RATE);
  total = computed(() => this.subtotal() - this.discount() + this.DELIVERY_FEE);

  shippingForm: ShippingInfoDto = {
    recipientName: '',
    phoneNumber: '',
    additionalPhoneNumber: '',
    state: '',
    city: '',
    street: '',
    buildingNumber: ''
  };

  stripeLoaded = false;
  stripeCard: any = null;
  stripe: any = null;

  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly cartService: CartService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.loadStripe();
  }

  private loadData(): void {
    this.loading.set(true);
    forkJoin({
      shippingInfo: this.checkoutService.getShippingInfo().pipe(catchError(() => of(null))),
      fixed: this.cartService.getFixedItems().pipe(catchError(() => of([]))),
      designs: this.cartService.getDesignItems().pipe(catchError(() => of([])))
    }).subscribe(({ shippingInfo, fixed, designs }) => {
      if (shippingInfo) {
        this.shippingForm = { ...this.shippingForm, ...shippingInfo };
      }
      const allItems = [
        ...(fixed ?? []).map((f: any) => ({
          name: f.productName || f.ProductName || f.name || f.Name || 'Product',
          imageUrl: f.imageUrl || f.ImageUrl || f.image || f.Image || null,
          price: f.price || f.Price || 0,
          quantity: f.quantity || f.Quantity || 1,
          size: f.size || f.Size,
          meta: [(f.colorName || f.ColorName), (f.size || f.Size) ? 'Size: '+(f.size||f.Size) : null].filter(Boolean).join(' · ')
        })),
        ...(designs ?? []).map((d: any) => ({
          name: d.designName || d.DesignName || d.productName || d.ProductName || d.name || d.Name || 'Custom Design',
          imageUrl: d.imageUrl || d.ImageUrl || d.frontImage || d.FrontImage || d.image || d.Image || null,
          price: d.price || d.Price || 0,
          quantity: d.quantity || d.Quantity || 1,
          size: d.size || d.Size,
          meta: 'Custom Design' + ((d.size || d.Size) ? ` · Size: ${d.size || d.Size}` : '')
        }))
      ];
      this.cartItems.set(allItems);
      this.loading.set(false);
    });
  }

  private loadStripe(): void {
    if (typeof (window as any).Stripe !== 'undefined') {
      this.initStripe();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = () => this.initStripe();
    document.head.appendChild(script);
  }

  private initStripe(): void {
    this.stripe = Stripe('pk_test_51TNDcF3skyvwJKjn6byWhP8jUPRSOKPrbvB5KesI9VIF5pbYGKjk9qFl1fK3zvmNmGZQOkbqa03AUNdQYc1McSRQ00lsaRmcJG');
    const elements = this.stripe.elements();
    this.stripeCard = elements.create('card', {
      style: {
        base: {
          fontSize: '15px',
          color: '#111827',
          fontFamily: 'Inter, system-ui, sans-serif',
          '::placeholder': { color: '#9ca3af' }
        }
      }
    });
    // Mount after a tick to allow view to render
    setTimeout(() => {
      const mount = document.getElementById('stripe-card-element');
      if (mount) {
        this.stripeCard.mount('#stripe-card-element');
        this.stripeLoaded = true;
      }
    }, 300);
  }

  isFormValid(): boolean {
    const f = this.shippingForm;
    return !!(f.recipientName?.trim() && f.phoneNumber?.trim() &&
              f.state?.trim() && f.city?.trim() &&
              f.street?.trim() && f.buildingNumber?.trim());
  }

  async placeOrder(): Promise<void> {
    if (!this.isFormValid()) {
      this.errorMessage.set('Please fill in all required shipping fields.');
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      // 1. Create checkout session on backend
      const checkoutRes = await this.checkoutService.createCheckoutSession({
        shippingInfo: this.shippingForm
      }).toPromise();

      // 2. If we got a Stripe clientSecret, confirm payment
      const clientSecret = checkoutRes?.clientSecret || checkoutRes?.['ClientSecret'];
      if (clientSecret && this.stripe && this.stripeCard) {
        const result = await this.stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: this.stripeCard }
        });
        if (result.error) {
          this.errorMessage.set(result.error.message || 'Payment failed. Please try again.');
          this.submitting.set(false);
          return;
        }
      }

      // 3. If backend returns a redirect URL (Stripe Checkout Session), navigate there
      const redirectUrl = checkoutRes?.sessionUrl || checkoutRes?.url || checkoutRes?.['Url'];
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }

      // 4. Success
      this.successMessage.set('Order placed successfully! 🎉');
      this.submitting.set(false);
      setTimeout(() => this.router.navigate(['/customer/profile'], { queryParams: { tab: 'orders' } }), 2000);

    } catch (err: any) {
      this.errorMessage.set(err?.message || 'Checkout failed. Please try again.');
      this.submitting.set(false);
    }
  }
}
