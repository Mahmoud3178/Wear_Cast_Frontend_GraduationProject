import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { CustomerNavComponent } from '../shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../shared/customer-footer/customer-footer.component';
import {
  CartService,
  dispatchCartUpdated,
  MyCartResponse
} from '../../../core/services/cart.service';
import { FixedProductService } from '../../../core/services/fixed-product.service';
import { AuthService } from '../../../core/services/auth.service';

export interface PriceBreakdownLine {
  label: string;
  amount: number;
}

export interface CartItemView {
  cartItemId: number;
  name: string;
  meta: string;
  imageUrl: string;
  price: number;
  lineTotal: number;
  size?: string;
  quantity?: number;
  type: 'fixed' | 'design';
  sizes?: {
    sizeKey: string;
    sizeLabel: string;
    quantity: number;
    stock?: number;
  }[];
  colorId?: number;
  productId?: number;
  designId?: number;
  priceDescription?: string;
  priceBreakdown?: PriceBreakdownLine[];
  unavailable?: boolean;
}

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, CustomerNavComponent, CustomerFooterComponent],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css'
})
export class CartComponent implements OnInit {
  items = signal<CartItemView[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  quantityNotice = signal<string | null>(null);
  qtyUpdatingKey = signal<string | null>(null);
  subtotalFromApi = signal(0);
  deliveryFee = signal(0);
  grandTotal = signal(0);

  showProductDetailsModal = false;
  activeProductDetails: any = null;
  detailsModalLoading = false;

  subtotal = computed(() => this.subtotalFromApi());
  total = computed(() => this.grandTotal() || this.subtotal() + this.deliveryFee());
  totalQuantity = computed(() =>
    this.items().reduce((sum, i) => {
      let qty = 0;
      if (i.sizes && i.sizes.length > 0) {
        qty = i.sizes.reduce((s, sz) => s + sz.quantity, 0);
      } else {
        qty = i.quantity ?? 1;
      }
      return sum + qty;
    }, 0)
  );

  constructor(
    private readonly cartService: CartService,
    private readonly fixedProductService: FixedProductService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadCart();
  }

  clearQuantityNotice(): void {
    this.quantityNotice.set(null);
  }

  isQtyUpdating(item: CartItemView, sizeKey: string): boolean {
    return this.qtyUpdatingKey() === `${item.cartItemId}:${sizeKey}`;
  }

  private loadCart(forceRefresh = false): void {
    if (!this.authService.isLoggedIn()) {
      this.error.set('Please log in or sign in to view your cart.');
      this.loading.set(false);
      this.items.set([]);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.cartService
      .getMyCart(forceRefresh)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: cart => {
          this.applyMyCart(cart);
          dispatchCartUpdated(cart);
        },
        error: (err: any) => {
          if (err?.status === 401 || err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
            this.error.set('Please log in or sign in to view your cart.');
          } else {
            this.error.set(err?.message ?? 'Failed to load cart');
          }
          this.items.set([]);
        }
      });
  }

  private applyMyCart(cart: MyCartResponse): void {
    this.subtotalFromApi.set(cart.subTotal);
    this.deliveryFee.set(cart.deliveryFee);
    this.grandTotal.set(cart.grandTotal);

    const fixedViews = cart.fixedItems.map(f => {
      const sizesList = f.sizes.map(s => ({
        sizeKey: s.size,
        sizeLabel: this.formatSizeLabel(s.size),
        quantity: s.quantityInCart,
        stock: s.quantityAvailable
      }));
      const qty = f.totalQuantity || sizesList.reduce((s, x) => s + x.quantity, 0);
      return {
        cartItemId: f.cartItemId,
        name: f.productName,
        meta: '',
        imageUrl: this.resolveCartThumbnailUrl(f.image) || '/assets/placeholder.jpg',
        price: f.price,
        lineTotal: f.price * qty,
        type: 'fixed' as const,
        sizes: sizesList,
        colorId: f.productColorId,
        productId: f.productId,
        unavailable: f.unavailable,
        quantity: qty
      };
    });

    const designViews = cart.designedItems.map(d => {
      const sizesList = d.sizes.map(s => ({
        sizeKey: s.size,
        sizeLabel: this.formatSizeLabel(s.size),
        quantity: s.quantityInCart
      }));
      const qty = d.totalQuantity || sizesList.reduce((s, x) => s + x.quantity, 0);
      return {
        cartItemId: d.cartItemId,
        name: d.productName,
        meta: '',
        imageUrl: this.resolveCartThumbnailUrl(d.image) || '/assets/placeholder.jpg',
        price: d.price,
        lineTotal: d.price * qty,
        quantity: qty,
        type: 'design' as const,
        sizes: sizesList,
        designId: d.customerDesignedId,
        priceDescription: d.priceDescription,
        priceBreakdown: this.parsePriceDescription(d.priceDescription),
        unavailable: d.unavailable
      };
    });

    this.items.set([...fixedViews, ...designViews]);
  }

  private formatSizeLabel(size: string): string {
    return String(size ?? '').replace(/^_/, '').toUpperCase() || size;
  }

  parsePriceDescription(desc?: string): PriceBreakdownLine[] {
    if (!desc?.trim()) return [];
    const inner = desc.trim().replace(/^\[|\]$/g, '').trim();
    const lines: PriceBreakdownLine[] = [];
    for (const part of inner.split(/\s*\+\s*/)) {
      const segment = part.trim();
      if (!segment) continue;
      const labeled = segment.match(/^([^:=]+?):\s*([\d.]+)\s*EGP/i);
      if (labeled) {
        lines.push({ label: labeled[1].trim(), amount: parseFloat(labeled[2]) });
        continue;
      }
      const totalOnly = segment.match(/^=\s*([\d.]+)\s*EGP/i);
      if (totalOnly) {
        lines.push({ label: 'Unit price', amount: parseFloat(totalOnly[1]) });
      }
    }
    return lines;
  }

  removeItem(item: CartItemView): void {
    this.cartService.deleteItem(item.cartItemId).subscribe({
      next: () => {
        this.cartService.getMyCart(true).subscribe({
          next: cart => {
            this.applyMyCart(cart);
            dispatchCartUpdated(cart);
          },
          error: (err: Error) => {
            this.error.set(err?.message ?? 'Failed to refresh cart');
          }
        });
      },
      error: (err) => {
        console.error('Failed to remove item', err);
      }
    });
  }

  increaseQty(item: CartItemView, sizeKey: string): void {
    this.changeQty(item, sizeKey, 1);
  }

  decreaseQty(item: CartItemView, sizeKey: string): void {
    this.changeQty(item, sizeKey, -1);
  }

  private changeQty(item: CartItemView, sizeKey: string, quantityChange: number): void {
    const apiSize = String(sizeKey ?? '').trim();
    if (!apiSize || this.qtyUpdatingKey()) return;
    const delta = quantityChange > 0 ? 1 : -1;
    this.quantityNotice.set(null);

    const key = `${item.cartItemId}:${apiSize}`;
    this.qtyUpdatingKey.set(key);

    this.cartService.updateItemQuantity(item.cartItemId, apiSize, delta).subscribe({
      next: cart => {
        this.applyMyCart(cart);
        dispatchCartUpdated(cart);
        this.qtyUpdatingKey.set(null);
      },
      error: (err: Error) => {
        this.quantityNotice.set(err?.message ?? 'Could not update quantity.');
        this.qtyUpdatingKey.set(null);
      }
    });
  }

  private resolveCartThumbnailUrl(raw: string): string {
    const u = raw.trim();
    if (!u) return '';
    if (u.startsWith('data:')) return u;
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith('//')) {
      return `${typeof window !== 'undefined' ? window.location.protocol : 'https:'}${u}`;
    }
    const base = environment.apiUrl.replace(/\/$/, '');
    const path = u.startsWith('/') ? u : `/${u}`;
    return base ? `${base}${path}` : path;
  }

  openSizeDetails(item: CartItemView): void {
    if (item.type !== 'fixed' || !item.productId) return;
    this.showProductDetailsModal = true;
    this.detailsModalLoading = true;
    this.activeProductDetails = null;
    this.fixedProductService.getDetailsById(item.productId).subscribe({
      next: res => {
        this.detailsModalLoading = false;
        this.activeProductDetails = res;
      },
      error: () => {
        this.detailsModalLoading = false;
      }
    });
  }

  closeSizeDetailsModal(): void {
    this.showProductDetailsModal = false;
    this.activeProductDetails = null;
  }

  formatSize(s: string): string {
    return s.replace(/^_/, '');
  }
}
