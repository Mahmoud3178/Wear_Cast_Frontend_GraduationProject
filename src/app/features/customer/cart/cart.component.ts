import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { CustomerNavComponent } from '../shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../shared/customer-footer/customer-footer.component';
import {
  CartService,
  CartFixedItem,
  CartDesignItem
} from '../../../core/services/cart.service';
import { FixedProductService } from '../../../core/services/fixed-product.service';

/** Unified view model for both fixed + designed items */
export interface CartItemView {
  cartItemId: number;
  name: string;
  meta: string;
  imageUrl: string;
  price: number;
  size?: string;
  quantity?: number;
  type: 'fixed' | 'design';
  // For fixed items
  sizes?: { sizeEnum: number; sizeLabel: string; quantity: number }[];
  // raw refs for update calls
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

  // Size details modal
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

  private loadCart(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      fixed: this.cartService.getFixedItems().pipe(catchError(() => of([]))),
      designs: this.cartService.getDesignItems().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ fixed, designs }) => {
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
          return s; // fallback
        };

        const fixedViews: CartItemView[] = (fixed ?? []).map((f: any) => {
          const colorName = f.colorName || f.ColorName || '';
          const basePrice = f.price || f.Price || 0;
          const imageUrl  = f.imageUrl || f.ImageUrl || f.image || f.Image || '/assets/placeholder.jpg';
          const productName = f.productName || f.ProductName || f.name || f.Name || 'Fixed Product';
          const colorId = f.colorId || f.ColorId;
          const cartItemId = f.cartItemId || f.CartItemId;
          const productId = f.productId || f.ProductId;

          // API may return a flat { size, quantity } OR a grouped { sizes: [{size,quantity}] }
          const sizesArray: { size: any; quantity: number }[] = Array.isArray(f.sizes ?? f.Sizes)
            ? (f.sizes ?? f.Sizes)
            : [{ size: f.size ?? f.Size ?? f.sizeId ?? f.SizeId, quantity: f.quantity ?? f.Quantity ?? 1 }];

          const sizesList = sizesArray
            .filter(s => s.quantity > 0 || s.size != null)
            .map((s) => {
              const sVal = mapSize(s.size) || '';
              const sizeEnum = typeof s.size === 'number' ? s.size : (mapSize(s.size) ? this.sizeToEnum(mapSize(s.size)!) : 0);
              return { sizeLabel: sVal, quantity: s.quantity ?? 1, sizeEnum };
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
          // API returns sizes array with nested size and quantityInCart
          const sizesArray = d.sizes ?? d.Sizes ?? [];
          const sizeEntry = Array.isArray(sizesArray) && sizesArray.length > 0 ? sizesArray[0] : null;
          const sizeFromArray = sizeEntry?.size ?? sizeEntry?.Size;
          const qtyFromArray = sizeEntry?.quantityInCart ?? sizeEntry?.QuantityInCart;

          const rawSize = sizeFromArray ?? d.size ?? d.Size ?? d.itemSize ?? d.ItemSize ?? d.productSize ?? d.ProductSize ?? d.designSize ?? d.DesignSize;
          const sVal = mapSize(rawSize);
          const nameVal = d.designName || d.DesignName || d.name || d.Name || d.productName || d.ProductName;
          const rawQty = qtyFromArray ?? d.quantity ?? d.Quantity ?? d.qty ?? d.Qty ?? d.cartItemQuantity ?? d.CartItemQuantity ?? 1;
          const metaParts = [sVal ? `Size: ${sVal}` : ''].filter(Boolean);
          const designImg =
            this.pickDesignCartImageUrl(d) || '/assets/placeholder.jpg';
          return {
            cartItemId: d.cartItemId || d.CartItemId,
            name: nameVal || 'Custom Design',
            meta: metaParts.join(' · '),
            imageUrl: designImg,
            price: d.price || d.Price || 0,
            size: sVal,
            quantity: rawQty,
            type: 'design',
            designId:
              d.designId ||
              d.DesignId ||
              d.customerDesignedId ||
              d.CustomerDesignedId ||
              d.customerDesignId ||
              d.CustomerDesignId ||
              d.id ||
              d.Id
          };
        });

        this.items.set([...fixedViews, ...designViews]);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Failed to load cart');
        this.loading.set(false);
      }
    });
  }

  removeItem(item: CartItemView, sizeEnum?: number): void {
    if (item.type === 'fixed' && item.colorId != null && sizeEnum != null) {
      this.updateQty(item, 0, sizeEnum);
      return;
    }
    // For design items, fallback to full delete
    this.cartService.deleteItem(item.cartItemId).subscribe({
      next: () => {
        this.items.update(list => list.filter(i => i.cartItemId !== item.cartItemId));
      },
      error: (err) => {
        console.error('Failed to remove item', err);
      }
    });
  }

  increaseQty(item: CartItemView, sizeEnum?: number): void {
    const currentQty = this.getCurrentQty(item, sizeEnum);
    this.updateQty(item, currentQty + 1, sizeEnum);
  }

  decreaseQty(item: CartItemView, sizeEnum?: number): void {
    const currentQty = this.getCurrentQty(item, sizeEnum);
    if (currentQty <= 1) {
      this.removeItem(item, sizeEnum);
      return;
    }
    this.updateQty(item, currentQty - 1, sizeEnum);
  }

  private getCurrentQty(item: CartItemView, sizeEnum?: number): number {
    if (item.type === 'fixed' && sizeEnum != null) {
      return item.sizes?.find(s => s.sizeEnum === sizeEnum)?.quantity ?? 1;
    }
    return item.quantity ?? 1;
  }

  private updateQty(item: CartItemView, qty: number, sizeEnum?: number): void {
    // Optimistically update UI
    if (item.type === 'fixed' && sizeEnum != null) {
      this.items.update(list => list.map(i => {
        if (i.cartItemId !== item.cartItemId) return i;
        const newSizes = i.sizes?.map(s => s.sizeEnum === sizeEnum ? { ...s, quantity: qty } : s) || [];
        const filteredSizes = newSizes.filter(s => s.quantity > 0);
        if (filteredSizes.length === 0) return null as any; // All sizes removed
        return { ...i, sizes: filteredSizes };
      }).filter(Boolean));
    } else {
      if (qty <= 0) {
        this.items.update(list => list.filter(i => i.cartItemId !== item.cartItemId));
      } else {
        this.items.update(list =>
          list.map(i => i.cartItemId === item.cartItemId ? { ...i, quantity: qty } : i)
        );
      }
    }

    const actualSizeEnum = sizeEnum ?? this.sizeToEnum(item.size);

    const req$ = item.type === 'fixed' && item.colorId != null
      ? this.cartService.addOrUpdateFixed({
          colorId: item.colorId,
          sizes: [{ size: actualSizeEnum, quantity: qty }]
        })
      : item.type === 'design' && item.designId != null
        ? this.cartService.addOrUpdateDesigned({ designId: item.designId, size: actualSizeEnum, quantity: qty })
        : of(null);

    req$.subscribe({
      error: (err) => {
        console.error('Failed to update quantity', err);
        // Rollback simple, just reload cart
        this.loadCart();
      }
    });
  }

  /**
   * Cart thumbnail URLs: keep absolute `https://…` as returned by the API so the browser
   * loads the same file the server attached to the design (img tags are not CORS-tainted).
   * Only root-relative paths are prefixed with `environment.apiUrl`.
   */
  private resolveCartThumbnailUrl(raw: string): string {
    const u = raw.trim();
    if (!u) return '';
    if (u.startsWith('data:')) return u;
    if (/^https?:\/\//i.test(u)) {
      return u;
    }
    if (u.startsWith('//')) {
      return `${typeof window !== 'undefined' ? window.location.protocol : 'https:'}${u}`;
    }
    const base = environment.apiUrl.replace(/\/$/, '');
    const path = u.startsWith('/') ? u : `/${u}`;
    return base ? `${base}${path}` : path;
  }

  /** Cart APIs vary field names for the design preview; `image` is what GetDesignsInCart returns today. */
  private pickDesignCartImageUrl(d: Record<string, unknown>): string {
    const keys = [
      'image',
      'Image',
      'compositeImageUrl',
      'CompositeImageUrl',
      'frontImageUrl',
      'FrontImageUrl',
      'customDesignImageUrl',
      'CustomDesignImageUrl',
      'designPreviewUrl',
      'DesignPreviewUrl',
      'previewImageUrl',
      'PreviewImageUrl',
      'thumbnailUrl',
      'ThumbnailUrl',
      'imageUrl',
      'ImageUrl',
      'mainImageUrl',
      'MainImageUrl',
      'pictureUrl',
      'PictureUrl',
      'frontImage',
      'FrontImage'
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

  /** Maps size string like "S", "M", "L", "XL", "XXL" to the API integer enum */
  private sizeToEnum(size: string | undefined | null): number {
    if (!size) return 14; // default M
    const map: Record<string, number> = {
      '2XS': 11, '_2XS': 11, 'XXS': 11,
      'XS': 12, '_XS': 12,
      'S': 13, '_S': 13,
      'M': 14, '_M': 14,
      'L': 15, '_L': 15,
      'XL': 16, '_XL': 16,
      '2XL': 17, '_2XL': 17, 'XXL': 17,
      '3XL': 18, '_3XL': 18, 'XXXL': 18,
      '4XL': 19, '_4XL': 19,
      '5XL': 20, '_5XL': 20
    };
    return map[size.toUpperCase().replace(/^_/, '')] ?? 14;
  }

  // ── Size details modal ─────────────────────────────────────────

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
