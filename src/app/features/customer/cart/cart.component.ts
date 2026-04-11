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

  readonly DELIVERY_FEE = 15;
  readonly DISCOUNT_RATE = 0.20;

  subtotal = computed(() =>
    this.items().reduce((s, i) => s + i.price * i.quantity, 0)
  );
  discount = computed(() => this.subtotal() * this.DISCOUNT_RATE);
  total = computed(() => this.subtotal() - this.discount() + this.DELIVERY_FEE);

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
        const fixedViews: CartItemView[] = (fixed ?? []).map((f: any) => ({
          cartItemId: f.cartItemId || f.CartItemId,
          name: f.productName || f.ProductName || f.name || f.Name || 'Fixed Product',
          meta: `${f.colorName || f.ColorName || ''} · Size: ${f.size || f.Size}`,
          imageUrl: f.imageUrl || f.ImageUrl || f.image || f.Image || '/assets/placeholder.jpg',
          price: f.price || f.Price || 0,
          size: f.size || f.Size,
          quantity: f.quantity || f.Quantity || 1,
          type: 'fixed',
          colorId: f.colorId || f.ColorId
        }));

        const designViews: CartItemView[] = (designs ?? []).map((d: any) => ({
          cartItemId: d.cartItemId || d.CartItemId,
          name: d.designName || d.DesignName || d.name || d.Name || 'Custom Design',
          meta: `Custom · Size: ${d.size || d.Size}`,
          imageUrl: d.imageUrl || d.ImageUrl || d.frontImage || d.FrontImage || d.image || d.Image || '/assets/placeholder.jpg',
          price: d.price || d.Price || 0,
          size: d.size || d.Size,
          quantity: d.quantity || d.Quantity || 1,
          type: 'design',
          designId: d.designId || d.DesignId || d.customerDesignId || d.CustomerDesignId
        }));

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
