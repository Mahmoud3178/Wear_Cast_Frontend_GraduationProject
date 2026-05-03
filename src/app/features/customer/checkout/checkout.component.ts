import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CustomerNavComponent } from '../shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../shared/customer-footer/customer-footer.component';
import { CheckoutService, ShippingInfoDto } from '../../../core/services/checkout.service';
import { CartService } from '../../../core/services/cart.service';

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

  subtotal = computed(() =>
    this.cartItems().reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0)
  );
  total = computed(() => this.subtotal());
  totalQuantity = computed(() =>
    this.cartItems().reduce((sum, i) => sum + (i.quantity || 1), 0)
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
      fixed: this.cartService.getFixedItems().pipe(catchError(() => of([]))),
      designs: this.cartService.getDesignItems().pipe(catchError(() => of([])))
    }).subscribe(({ shippingInfo, fixed, designs }) => {
      if (shippingInfo) {
        this.shippingForm = { ...this.shippingForm, ...shippingInfo };
      }

      // API size enum: 13=S, 14=M, 15=L, 16=XL, 17=2XL, 18=3XL, 19=4XL, 20=5XL
      // Also support 0-4 mapping for backward compatibility
      const sizeMap: Record<number, string> = {
        0: 'S', 1: 'M', 2: 'L', 3: 'XL', 4: '2XL',
        13: 'S', 14: 'M', 15: 'L', 16: 'XL', 17: '2XL',
        18: '3XL', 19: '4XL', 20: '5XL'
      };

      const mapSize = (s: any) => {
        if (s == null || s === '') return null;
        // Handle string sizes like "_L", "_XL", "_2XL" -> "L", "XL", "2XL"
        if (typeof s === 'string') {
          const clean = s.replace(/^_/, ''); // Remove leading underscore
          if (clean) return clean;
        }
        const num = parseInt(s, 10);
        if (!isNaN(num) && sizeMap[num]) return sizeMap[num];
        return s;
      };

      const fixedRows = (fixed ?? []).flatMap((f: any) => {
        const sizesArray: { size: any; quantity: number }[] = Array.isArray(f.sizes ?? f.Sizes)
          ? (f.sizes ?? f.Sizes)
          : [{
              size: f.size ?? f.Size,
              quantity:
                f.quantity ??
                f.Quantity ??
                f.quantityInCart ??
                f.QuantityInCart ??
                1
            }];
        const name = f.productName || f.ProductName || f.name || f.Name || 'Product';
        const imageUrl = f.imageUrl || f.ImageUrl || f.image || f.Image || '/assets/placeholder.jpg';
        const unitPrice = this.asNum(f.price ?? f.Price, 0);
        const colorName = f.colorName || f.ColorName || '';
        return sizesArray
          .map((s: any) => {
            const sVal = mapSize(s.size);
            const qty = this.asNum(s.quantity ?? s.Quantity ?? s.quantityInCart ?? s.QuantityInCart, 0);
            if (qty <= 0) return null;
            return {
              name,
              imageUrl,
              price: unitPrice,
              quantity: qty,
              size: sVal,
              meta: [colorName, sVal ? 'Size: ' + sVal : null].filter(Boolean).join(' · ')
            };
          })
          .filter((x: any) => !!x);
      });

      const designRows = (designs ?? []).flatMap((d: any) => {
        const sizesArray = Array.isArray(d.sizes ?? d.Sizes) ? (d.sizes ?? d.Sizes) : [];
        const name = d.designName || d.DesignName || d.name || d.Name || d.productName || d.ProductName || 'Custom Design';
        const imageUrl = d.imageUrl || d.ImageUrl || d.frontImage || d.FrontImage || d.image || d.Image || '/assets/placeholder.jpg';
        const unitPrice = this.asNum(d.price ?? d.Price, 0);
        const mapped = sizesArray
          .map((s: any) => {
            const sVal = mapSize(s?.size ?? s?.Size);
            const qty = this.asNum(s?.quantityInCart ?? s?.QuantityInCart ?? s?.quantity ?? s?.Quantity, 0);
            if (!sVal || qty <= 0) return null;
            return {
              name,
              imageUrl,
              price: unitPrice,
              quantity: qty,
              size: sVal,
              meta: `Custom Design · Size: ${sVal}`
            };
          })
          .filter((x: any) => !!x);

        if (mapped.length) return mapped;

        const fallbackSize = mapSize(d.size ?? d.Size ?? d.itemSize ?? d.ItemSize ?? d.productSize ?? d.ProductSize ?? d.designSize ?? d.DesignSize);
        const fallbackQty = this.asNum(d.quantity ?? d.Quantity ?? d.cartItemQuantity ?? d.CartItemQuantity, 1);
        return [{
          name,
          imageUrl,
          price: unitPrice,
          quantity: fallbackQty,
          size: fallbackSize,
          meta: 'Custom Design' + (fallbackSize ? ` · Size: ${fallbackSize}` : '')
        }];
      });

      const allItems = [...fixedRows, ...designRows];
      this.cartItems.set(allItems);
      this.loading.set(false);
    });
  }

  isFormValid(): boolean {
    const f = this.shippingForm;
    return !!(f.recipientName?.trim() && f.phoneNumber?.trim() &&
              f.state?.trim() && f.city?.trim() &&
              f.street?.trim() && f.buildingNumber?.trim());
  }

  placeOrder(): void {
    if (!this.isFormValid()) {
      this.errorMessage.set('Please fill in all required shipping fields.');
      return;
    }
    if (this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);

    const summary = {
      at: new Date().toISOString(),
      lineCount: this.cartItems().length,
      totalQty: this.totalQuantity(),
      subtotal: this.subtotal()
    };
    console.log('[WearCast] Checkout start', summary);

    this.checkoutService.createCheckoutSession({
      shippingInfo: this.shippingForm
    }).subscribe({
      next: (res: any) => {
        const checkoutUrl =
          res?.checkoutUrl || res?.CheckoutUrl ||
          res?.sessionUrl || res?.SessionUrl ||
          res?.url || res?.Url;

        if (checkoutUrl) {
          // Redirect to Stripe-hosted checkout page
          window.location.href = checkoutUrl;
        } else {
          // No URL returned — treat as success
          this.successMessage.set('Order placed successfully! 🎉');
          this.submitting.set(false);
          setTimeout(() => this.router.navigate(['/customer/profile'], { queryParams: { tab: 'orders' } }), 2000);
        }
      },
      error: (err: any) => {
        let msg =
          err?.error?.description ||
          err?.error?.message ||
          err?.error?.detail ||
          err?.message ||
          'Checkout failed. Please try again.';

        // Handle specific backend SQL errors with user-friendly messages
        if (msg.includes("Invalid column name") || msg.includes("column name")) {
          msg = 'Server configuration error. Please contact support.';
        }

        this.errorMessage.set(msg);
        this.submitting.set(false);
      }
    });
  }

  private asNum(v: unknown, fallback: number): number {
    const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
    if (!Number.isFinite(n)) return fallback;
    return n;
  }
}
