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

      const allItems = [
        ...(fixed ?? []).map((f: any) => {
          const sVal = mapSize(f.size ?? f.Size);
          const rawQty = f.quantity ?? f.Quantity ?? f.qty ?? f.Qty ?? 1;
          return {
            name: f.productName || f.ProductName || f.name || f.Name || 'Product',
            imageUrl: f.imageUrl || f.ImageUrl || f.image || f.Image || '/assets/placeholder.jpg',
            price: f.price || f.Price || 0,
            quantity: rawQty,
            size: sVal,
            meta: [(f.colorName || f.ColorName), sVal ? 'Size: ' + sVal : null].filter(Boolean).join(' · ')
          };
        }),
        ...(designs ?? []).map((d: any) => {
          // API returns sizes array with nested size and quantityInCart
          const sizesArray = d.sizes ?? d.Sizes ?? [];
          const sizeEntry = Array.isArray(sizesArray) && sizesArray.length > 0 ? sizesArray[0] : null;
          const sizeFromArray = sizeEntry?.size ?? sizeEntry?.Size;
          const qtyFromArray = sizeEntry?.quantityInCart ?? sizeEntry?.QuantityInCart;

          const rawSize = sizeFromArray ?? d.size ?? d.Size ?? d.itemSize ?? d.ItemSize ?? d.productSize ?? d.ProductSize ?? d.designSize ?? d.DesignSize;
          const sVal = mapSize(rawSize);
          const nameVal = d.designName || d.DesignName || d.name || d.Name || d.productName || d.ProductName;
          const rawQty = qtyFromArray ?? d.quantity ?? d.Quantity ?? d.cartItemQuantity ?? d.CartItemQuantity ?? 1;

          return {
            name: nameVal || 'Custom Design',
            imageUrl: d.imageUrl || d.ImageUrl || d.frontImage || d.FrontImage || d.image || d.Image || '/assets/placeholder.jpg',
            price: d.price || d.Price || 0,
            quantity: rawQty,
            size: sVal,
            meta: 'Custom Design' + (sVal ? ` · Size: ${sVal}` : '')
          };
        })
      ];
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
    this.submitting.set(true);
    this.errorMessage.set(null);

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
        let msg = err?.error?.message || err?.error?.detail || err?.message || 'Checkout failed. Please try again.';

        // Handle specific backend SQL errors with user-friendly messages
        if (msg.includes("Invalid column name") || msg.includes("column name")) {
          msg = 'Server configuration error. Please contact support.';
        }

        this.errorMessage.set(msg);
        this.submitting.set(false);
      }
    });
  }
}
