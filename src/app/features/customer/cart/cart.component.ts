import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { CustomerNavComponent } from '../shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../shared/customer-footer/customer-footer.component';
import {
  CartService,
  CartFixedItem,
  CartDesignItem
} from '../../../core/services/cart.service';

/** Unified view model for both fixed + designed items */
export interface CartItemView {
  cartItemId: number;
  name: string;
  meta: string;
  imageUrl: string;
  price: number;
  size: string;
  quantity: number;
  type: 'fixed' | 'design';
  // raw refs for update calls
  colorId?: number;
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

  subtotal = computed(() =>
    this.items().reduce((s, i) => s + i.price * (i.quantity ?? 1), 0)
  );
  total = computed(() => this.subtotal());
  totalQuantity = computed(() =>
    this.items().reduce((sum, i) => sum + (i.quantity ?? 1), 0)
  );

  constructor(private readonly cartService: CartService) {}

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
          const sVal = mapSize(f.size ?? f.Size);
          const colorName = f.colorName || f.ColorName || '';
          const rawQty = f.quantity ?? f.Quantity ?? f.qty ?? f.Qty ?? 1;
          const metaParts = [colorName, sVal ? `Size: ${sVal}` : ''].filter(Boolean);
          return {
            cartItemId: f.cartItemId || f.CartItemId,
            name: f.productName || f.ProductName || f.name || f.Name || 'Fixed Product',
            meta: metaParts.join(' · ') || 'Fixed Product',
            imageUrl: f.imageUrl || f.ImageUrl || f.image || f.Image || '/assets/placeholder.jpg',
            price: f.price || f.Price || 0,
            size: sVal,
            quantity: f.quantity ?? f.Quantity ?? f.qty ?? f.Qty ?? 1,
            type: 'fixed',
            colorId: f.colorId || f.ColorId
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
          return {
            cartItemId: d.cartItemId || d.CartItemId,
            name: nameVal || 'Custom Design',
            meta: metaParts.join(' · '),
            imageUrl: d.imageUrl || d.ImageUrl || d.frontImage || d.FrontImage || d.image || d.Image || '/assets/placeholder.jpg',
            price: d.price || d.Price || 0,
            size: sVal,
            quantity: rawQty,
            type: 'design',
            designId: d.designId || d.DesignId || d.customerDesignId || d.CustomerDesignId || d.id || d.Id
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

  removeItem(item: CartItemView): void {
    this.cartService.deleteItem(item.cartItemId).subscribe({
      next: () => {
        this.items.update(list => list.filter(i => i.cartItemId !== item.cartItemId));
      },
      error: (err) => {
        console.error('Failed to remove item', err);
      }
    });
  }

  increaseQty(item: CartItemView): void {
    this.updateQty(item, item.quantity + 1);
  }

  decreaseQty(item: CartItemView): void {
    if (item.quantity <= 1) {
      this.removeItem(item);
      return;
    }
    this.updateQty(item, item.quantity - 1);
  }

  private updateQty(item: CartItemView, qty: number): void {
    // Optimistically update UI
    this.items.update(list =>
      list.map(i => i.cartItemId === item.cartItemId ? { ...i, quantity: qty } : i)
    );

    const sizeEnum = this.sizeToEnum(item.size);

    const req$ = item.type === 'fixed' && item.colorId != null
      ? this.cartService.addOrUpdateFixed({ colorId: item.colorId, size: sizeEnum, quantity: qty })
      : item.type === 'design' && item.designId != null
        ? this.cartService.addOrUpdateDesigned({ designId: item.designId, size: sizeEnum, quantity: qty })
        : of(null);

    req$.subscribe({
      error: (err) => {
        console.error('Failed to update quantity', err);
        // Rollback
        this.items.update(list =>
          list.map(i => i.cartItemId === item.cartItemId ? { ...i, quantity: item.quantity } : i)
        );
      }
    });
  }

  /** Maps size string like "S", "M", "L", "XL", "XXL" to the API integer enum */
  private sizeToEnum(size: string): number {
    const map: Record<string, number> = {
      '2XS': 11, 'XXS': 11,
      'XS': 12,
      'S': 13,
      'M': 14,
      'L': 15,
      'XL': 16,
      '2XL': 17, 'XXL': 17,
      '3XL': 18, 'XXXL': 18,
      '4XL': 19,
      '5XL': 20
    };
    return map[size.toUpperCase()] ?? 14;
  }
}
