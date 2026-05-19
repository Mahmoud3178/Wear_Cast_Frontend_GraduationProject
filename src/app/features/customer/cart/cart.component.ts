import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { CustomerNavComponent } from '../shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../shared/customer-footer/customer-footer.component';
import {
  CartService,
  dispatchCartUpdated,
  MyCartResponse,
  SizeQuantityItem
} from '../../../core/services/cart.service';

export interface PriceBreakdownLine {
  label: string;
  amount: number;
}
import { FixedProductService } from '../../../core/services/fixed-product.service';

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
  sizes?: { sizeEnum: number; sizeLabel: string; quantity: number; stock?: number }[];
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
    private readonly fixedProductService: FixedProductService
  ) {}

  ngOnInit(): void {
    this.loadCart();
  }

  clearQuantityNotice(): void {
    this.quantityNotice.set(null);
  }

  private reloadCartAfterMutation(): void {
    this.loadCart(true);
  }

  private loadCart(forceRefresh = false): void {
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
        error: (err: Error) => {
          this.error.set(err?.message ?? 'Failed to load cart');
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
        sizeLabel: this.formatSizeLabel(s.size),
        sizeEnum: this.sizeToEnum(s.size),
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
        sizeLabel: this.formatSizeLabel(s.size),
        sizeEnum: this.sizeToEnum(s.size),
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
        this.items.update(list => list.filter(i => i.cartItemId !== item.cartItemId));
        // ← أبلغ الـ nav بالتغيير
        this.reloadCartAfterMutation();
      },
      error: (err) => {
        console.error('Failed to remove item', err);
      }
    });
  }

  increaseQty(item: CartItemView, sizeEnum?: number): void {
    this.updateQty(item, +1, sizeEnum);
  }

  decreaseQty(item: CartItemView, sizeEnum?: number): void {
    this.updateQty(item, -1, sizeEnum);
  }

  private getCurrentQty(item: CartItemView, sizeEnum?: number): number {
    if (sizeEnum != null) {
      return item.sizes?.find(s => s.sizeEnum === sizeEnum)?.quantity ?? 0;
    }
    return item.quantity ?? 0;
  }

  private updateQty(item: CartItemView, delta: number, sizeEnum?: number): void {
    const targetSizeEnum = sizeEnum ?? item.sizes?.[0]?.sizeEnum ?? this.sizeToEnum(item.size);
    const currentQty = this.getCurrentQty(item, targetSizeEnum);
    const nextQty = currentQty + delta;
    if (delta === 0) return;
    this.quantityNotice.set(null);

    if (targetSizeEnum != null) {
      this.items.update(list => list.map(i => {
        if (i.cartItemId !== item.cartItemId) return i;
        const newSizes = i.sizes?.map(s => {
          if (s.sizeEnum !== targetSizeEnum) return s;
          return { ...s, quantity: Math.max(0, s.quantity + delta) };
        }) || [];
        const filteredSizes = newSizes.filter(s => s.quantity > 0);
        if (filteredSizes.length === 0) return null as any;
        const nextQty = filteredSizes.reduce((sum, s) => sum + s.quantity, 0);
        return { ...i, sizes: filteredSizes, quantity: nextQty };
      }).filter(Boolean));
    } else {
      if (nextQty <= 0) {
        this.items.update(list => list.filter(i => i.cartItemId !== item.cartItemId));
      } else {
        this.items.update(list =>
          list.map(i => i.cartItemId === item.cartItemId ? { ...i, quantity: nextQty } : i)
        );
      }
    }

    const actualSizeEnum = targetSizeEnum;
    const absNext = Math.max(0, nextQty);

    const rebuildFixedSizesPayload = (): SizeQuantityItem[] | null => {
      if (!item.sizes?.length || item.colorId == null) return null;
      return item.sizes
        .map(s => ({
          size: s.sizeEnum,
          quantity: s.sizeEnum === actualSizeEnum ? absNext : s.quantity
        }))
        .filter(s => s.quantity > 0);
    };

    let req$: Observable<unknown>;
    if (item.type === 'fixed' && item.colorId != null) {
      if (delta > 0) {
        if (actualSizeEnum == null) {
          req$ = of(null);
        } else {
          req$ = this.cartService.addOrUpdateFixed({
            colorId: item.colorId,
            sizes: [{ size: actualSizeEnum, quantity: 1 }]
          });
        }
      } else if (item.cartItemId != null && actualSizeEnum != null) {
        if (absNext <= 0) {
          req$ = this.cartService.deleteItem(item.cartItemId);
        } else {
          req$ = this.cartService.updateItemQuantity(item.cartItemId, actualSizeEnum, absNext);
        }
      } else {
        const payload = rebuildFixedSizesPayload();
        if (payload === null) {
          req$ = of(null);
        } else if (payload.length === 0 && item.cartItemId != null) {
          req$ = this.cartService.deleteItem(item.cartItemId);
        } else if (payload.length > 0) {
          req$ = this.cartService.addOrUpdateFixed({ colorId: item.colorId, sizes: payload });
        } else {
          req$ = of(null);
        }
      }
    } else if (item.type === 'design' && item.designId != null) {
      req$ = this.cartService.addOrUpdateDesigned({
        designId: item.designId,
        size: actualSizeEnum,
        quantity: delta
      });
    } else {
      req$ = of(null);
    }

    req$.subscribe({
      next: () => {
        this.reloadCartAfterMutation();
      },
      error: (err: unknown) => {
        const msg =
          err instanceof Error ? err.message :
          typeof err === 'string' ? err :
          'Could not update quantity.';
        console.error('Failed to update quantity', err, {
          type: item.type,
          colorId: item.colorId,
          designId: item.designId,
          size: actualSizeEnum,
          sentQuantity: item.type === 'fixed' ? absNext : delta
        });
        this.quantityNotice.set(msg);
        this.loadCart();
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

  private sizeToEnum(size: string | undefined | null): number {
    if (!size) return 14;
    const map: Record<string, number> = {
      '2XS': 11, '_2XS': 11, 'XXS': 11,
      'XS': 12,  '_XS': 12,
      'S': 13,   '_S': 13,
      'M': 14,   '_M': 14,
      'L': 15,   '_L': 15,
      'XL': 16,  '_XL': 16,
      '2XL': 17, '_2XL': 17, 'XXL': 17,
      '3XL': 18, '_3XL': 18, 'XXXL': 18,
      '4XL': 19, '_4XL': 19,
      '5XL': 20, '_5XL': 20
    };
    return map[size.toUpperCase().replace(/^_/, '')] ?? 14;
  }

  private asPositiveInt(v: unknown, fallback: number): number {
    const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
    if (!Number.isFinite(n) || n < 0) return fallback;
    return Math.floor(n);
  }

  openSizeDetails(item: CartItemView): void {
    if (item.type !== 'fixed' || !item.productId) return;
    this.showProductDetailsModal = true;
    this.detailsModalLoading = true;
    this.activeProductDetails = null;
    this.fixedProductService.getDetailsById(item.productId).subscribe({
      next: (res) => {
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
