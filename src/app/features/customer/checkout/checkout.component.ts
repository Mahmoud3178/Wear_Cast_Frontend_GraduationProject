import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CustomerNavComponent } from '../shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../shared/customer-footer/customer-footer.component';
import { CheckoutService, ShippingInfoDto } from '../../../core/services/checkout.service';
import { CartService, MyCartResponse } from '../../../core/services/cart.service';
import { environment } from '../../../../environments/environment';

export interface CheckoutLineView {
  name: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  sizeLabel: string;
  type: 'fixed' | 'design';
  meta: string;
}

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

  cartItems = signal<CheckoutLineView[]>([]);
  subtotalFromApi = signal(0);
  deliveryFee = signal(0);
  grandTotal = signal(0);

  subtotal = computed(() => this.subtotalFromApi());
  total = computed(() => this.grandTotal() || this.subtotal() + this.deliveryFee());
  totalQuantity = computed(() =>
    this.cartItems().reduce((sum, i) => sum + i.quantity, 0)
  );

  shippingForm: ShippingInfoDto = {
    recipientName: '',
    phoneNumber: '',
    additionalPhoneNumber: '',
    state: '',
    city: '',
    street: '',
    buildingNumber: ''
  };

  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly cartService: CartService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loading.set(true);
    forkJoin({
      shippingInfo: this.checkoutService.getShippingInfo().pipe(catchError(() => of(null))),
      cart: this.cartService.getMyCart().pipe(
        catchError(() =>
          of({
            fixedItems: [],
            designedItems: [],
            subTotal: 0,
            deliveryFee: 0,
            grandTotal: 0
          } as MyCartResponse)
        )
      )
    }).subscribe(({ shippingInfo, cart }) => {
      if (shippingInfo) {
        this.shippingForm = { ...this.shippingForm, ...shippingInfo };
      }
      this.applyCart(cart);
      this.loading.set(false);
    });
  }

  private applyCart(cart: MyCartResponse): void {
    this.subtotalFromApi.set(cart.subTotal);
    this.deliveryFee.set(cart.deliveryFee);
    this.grandTotal.set(cart.grandTotal);

    const lines: CheckoutLineView[] = [];

    for (const f of cart.fixedItems) {
      for (const s of f.sizes) {
        if (s.quantityInCart <= 0) continue;
        const sizeLabel = this.formatSizeLabel(s.size);
        lines.push({
          name: f.productName,
          imageUrl: this.resolveImageUrl(f.image),
          unitPrice: f.price,
          quantity: s.quantityInCart,
          lineTotal: f.price * s.quantityInCart,
          sizeLabel,
          type: 'fixed',
          meta: `Fixed product · Size ${sizeLabel}`
        });
      }
    }

    for (const d of cart.designedItems) {
      for (const s of d.sizes) {
        if (s.quantityInCart <= 0) continue;
        const sizeLabel = this.formatSizeLabel(s.size);
        lines.push({
          name: d.productName,
          imageUrl: this.resolveImageUrl(d.image),
          unitPrice: d.price,
          quantity: s.quantityInCart,
          lineTotal: d.price * s.quantityInCart,
          sizeLabel,
          type: 'design',
          meta: d.priceDescription
            ? `Custom design · ${sizeLabel}`
            : `Custom design · Size ${sizeLabel}`
        });
      }
    }

    this.cartItems.set(lines);
  }

  private formatSizeLabel(size: string): string {
    return String(size ?? '').replace(/^_/, '').toUpperCase() || size;
  }

  private resolveImageUrl(raw: string): string {
    const u = (raw ?? '').trim();
    if (!u) return '/assets/placeholder.jpg';
    if (u.startsWith('data:') || /^https?:\/\//i.test(u)) return u;
    if (u.startsWith('//')) {
      return `${typeof window !== 'undefined' ? window.location.protocol : 'https:'}${u}`;
    }
    const base = environment.apiUrl.replace(/\/$/, '');
    const path = u.startsWith('/') ? u : `/${u}`;
    return base ? `${base}${path}` : path;
  }

  isFormValid(): boolean {
    const f = this.shippingForm;
    return !!(
      f.recipientName?.trim() &&
      f.phoneNumber?.trim() &&
      f.state?.trim() &&
      f.city?.trim() &&
      f.street?.trim() &&
      f.buildingNumber?.trim()
    );
  }

  placeOrder(): void {
    if (!this.isFormValid()) {
      this.errorMessage.set('Please fill in all required shipping fields.');
      return;
    }
    if (this.submitting()) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.checkoutService
      .createCheckoutSession({
        shippingInfo: this.shippingForm
      })
      .subscribe({
        next: (res: Record<string, unknown>) => {
          const checkoutUrl =
            (res['checkoutUrl'] as string) ||
            (res['CheckoutUrl'] as string) ||
            (res['sessionUrl'] as string) ||
            (res['SessionUrl'] as string) ||
            (res['url'] as string) ||
            (res['Url'] as string);

          if (checkoutUrl) {
            window.location.href = checkoutUrl;
          } else {
            this.successMessage.set('Order placed successfully!');
            this.submitting.set(false);
            setTimeout(
              () => this.router.navigate(['/customer/profile'], { queryParams: { tab: 'orders' } }),
              2000
            );
          }
        },
        error: (err: { error?: { description?: string; message?: string; detail?: string }; message?: string }) => {
          let msg =
            err?.error?.description ||
            err?.error?.message ||
            err?.error?.detail ||
            err?.message ||
            'Checkout failed. Please try again.';

          if (msg.includes('Invalid column name') || msg.includes('column name')) {
            msg = 'Server configuration error. Please contact support.';
          }

          this.errorMessage.set(msg);
          this.submitting.set(false);
        }
      });
  }
}
