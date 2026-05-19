import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { CustomerNavComponent } from '../shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../shared/customer-footer/customer-footer.component';
import {
  CartService,
  CartFixedItem,
  CartDesignItem,
  SizeQuantityItem
} from '../../../core/services/cart.service';
import { FixedProductService } from '../../../core/services/fixed-product.service';

export interface CartItemView {
  cartItemId: number;
  name: string;
  meta: string;
  imageUrl: string;
  price: number;
  size?: string;
  quantity?: number;
  type: 'fixed' | 'design';
  sizes?: { sizeEnum: number; sizeLabel: string; quantity: number }[];
  colorId?: number;
  productId?: number;
  designId?: number;
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

  showProductDetailsModal = false;
  activeProductDetails: any = null;
  detailsModalLoading = false;

  subtotal = computed(() =>
    this.items().reduce((s, i) => {
      let qty = 0;
      if (i.sizes && i.sizes.length > 0) {
        qty = i.sizes.reduce((sum, sz) => sum + sz.quantity, 0);
      } else {
        qty = i.quantity ?? 1;
      }
      return s + i.price * qty;
    }, 0)
  );
  total = computed(() => this.subtotal());
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

  private loadCart(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      fixed: this.cartService.getFixedItems().pipe(catchError(() => of([]))),
      designs: this.cartService.getDesignItems().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ fixed, designs }) => {
        const sizeMap: Record<number, string> = {
          0: 'S', 1: 'M', 2: 'L', 3: 'XL', 4: '2XL',
          13: 'S', 14: 'M', 15: 'L', 16: 'XL', 17: '2XL',
          18: '3XL', 19: '4XL', 20: '5XL'
        };

        const mapSize = (s: any) => {
          if (s == null || s === '') return null;
          if (typeof s === 'string') {
            const clean = s.replace(/^_/, '');
            if (clean) return clean;
          }
          const num = parseInt(s, 10);
          if (!isNaN(num) && sizeMap[num]) return sizeMap[num];
          return s;
        };

        const fixedViews: CartItemView[] = (fixed ?? []).map((f: any) => {
          const colorName = f.colorName || f.ColorName || '';
          const basePrice = f.price || f.Price || 0;
          const imageUrl  = f.imageUrl || f.ImageUrl || f.image || f.Image || '/assets/placeholder.jpg';
          const productName = f.productName || f.ProductName || f.name || f.Name || 'Fixed Product';
          const colorId =
            f.colorId ?? f.ColorId ??
            f.fixedProductColorId ?? f.FixedProductColorId ??
            f.productColorId ?? f.ProductColorId;
          const cartItemId = f.cartItemId || f.CartItemId;
          const productId = f.productId || f.ProductId;

          const sizesArray: { size: any; quantity?: number; quantityInCart?: number; QuantityInCart?: number }[] =
            Array.isArray(f.sizes ?? f.Sizes)
              ? (f.sizes ?? f.Sizes)
              : [{
                  size: f.size ?? f.Size ?? f.sizeId ?? f.SizeId,
                  quantity: f.quantity ?? f.Quantity ?? f.quantityInCart ?? f.QuantityInCart ?? 1
                }];

          const sizesList = sizesArray
            .filter(s => (s.quantity ?? s.quantityInCart ?? s.QuantityInCart ?? 0) > 0 || s.size != null)
            .map((s) => {
              const sVal = mapSize(s.size) || '';
              const sizeEnum = this.sizeToEnum(sVal || String(s.size ?? ''));
              const qty = this.asPositiveInt(
                s.quantity ?? s.quantityInCart ?? s.QuantityInCart ?? 1, 1
              );
              return { sizeLabel: sVal || String(s.size ?? ''), quantity: qty, sizeEnum };
            });

          const metaParts = [colorName].filter(Boolean);

          return {
            cartItemId,
            name: productName,
            meta: metaParts.join(' · ') || 'Fixed Product',
            imageUrl,
            price: basePrice,
            type: 'fixed' as const,
            sizes: sizesList,
            colorId,
            productId
          };
        });

        const designViews: CartItemView[] = (designs ?? []).map((d: any) => {
          const sizesArray = Array.isArray(d.sizes ?? d.Sizes) ? (d.sizes ?? d.Sizes) : [];
          const normalizedDesignSizes = sizesArray
            .map((s: any) => {
              const rawSize = s?.size ?? s?.Size ?? d.size ?? d.Size;
              const sVal = mapSize(rawSize);
              const qtyRaw = s?.quantityInCart ?? s?.QuantityInCart ?? s?.quantity ?? s?.Quantity ?? 0;
              const qty = this.asPositiveInt(qtyRaw, 0);
              if (!sVal || qty <= 0) return null;
              return { sizeLabel: sVal, sizeEnum: this.sizeToEnum(sVal), quantity: qty };
            })
            .filter((x: { sizeLabel: string; sizeEnum: number; quantity: number } | null): x is { sizeLabel: string; sizeEnum: number; quantity: number } => !!x);

          const fallbackRawSize =
            d.size ?? d.Size ?? d.itemSize ?? d.ItemSize ??
            d.productSize ?? d.ProductSize ?? d.designSize ?? d.DesignSize;
          const fallbackSize = mapSize(fallbackRawSize);
          const fallbackQty = this.asPositiveInt(
            d.quantity ?? d.Quantity ?? d.qty ?? d.Qty ?? d.cartItemQuantity ?? d.CartItemQuantity ?? 1, 1
          );
          const sizes = normalizedDesignSizes.length
            ? normalizedDesignSizes
            : fallbackSize
              ? [{ sizeLabel: fallbackSize, sizeEnum: this.sizeToEnum(fallbackSize), quantity: fallbackQty }]
              : [];
          const nameVal = d.designName || d.DesignName || d.name || d.Name || d.productName || d.ProductName;
          const totalQty = sizes.reduce((sum: number, s: { quantity: number }) => sum + s.quantity, 0) || fallbackQty;
          const designImg = this.pickDesignCartImageUrl(d) || '/assets/placeholder.jpg';

          return {
            cartItemId: d.cartItemId || d.CartItemId,
            name: nameVal || 'Custom Design',
            meta: 'Custom Design',
            imageUrl: designImg,
            price: d.price || d.Price || 0,
            quantity: totalQty,
            type: 'design',
            sizes,
            designId:
              d.designId ?? d.DesignId ??
              d.designedProductId ?? d.DesignedProductId ??
              d.productId ?? d.ProductId ??
              d.designedId ?? d.DesignedId ??
              d.customerDesignedId ?? d.CustomerDesignedId ??
              d.customerDesignId ?? d.CustomerDesignId
          };
        });

        this.items.set([...fixedViews, ...designViews]);
        this.loading.set(false);

        // ← أبلغ الـ nav بالتغيير
        window.dispatchEvent(new CustomEvent('cart-updated'));
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Failed to load cart');
        this.loading.set(false);
      }
    });
  }

  removeItem(item: CartItemView): void {
    this.cartService.deleteItem(item.cartItemId).subscribe({
      next: () => {
        this.items.update(list => list.filter(i => i.cartItemId !== item.cartItemId));
        // ← أبلغ الـ nav بالتغيير
        window.dispatchEvent(new CustomEvent('cart-updated'));
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
        this.loadCart(); // loadCart هيعمل dispatch لـ cart-updated تلقائياً
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

  private pickDesignCartImageUrl(d: Record<string, unknown>): string {
    const keys = [
      'image', 'Image', 'compositeImageUrl', 'CompositeImageUrl',
      'frontImageUrl', 'FrontImageUrl', 'customDesignImageUrl', 'CustomDesignImageUrl',
      'designPreviewUrl', 'DesignPreviewUrl', 'previewImageUrl', 'PreviewImageUrl',
      'thumbnailUrl', 'ThumbnailUrl', 'imageUrl', 'ImageUrl',
      'mainImageUrl', 'MainImageUrl', 'pictureUrl', 'PictureUrl',
      'frontImage', 'FrontImage'
    ];
    for (const k of keys) {
      const v = d[k];
      if (typeof v === 'string' && v.trim()) {
        const out = this.resolveCartThumbnailUrl(v);
        if (out) return out;
      }
    }
    return '';
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
