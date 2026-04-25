import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CustomerNavComponent } from '../shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../shared/customer-footer/customer-footer.component';
import {
  FixedProductService,
  FixedProductDetail,
  FixedProductColor,
  FixedProductColorDetail
} from '../../../core/services/fixed-product.service';
import { CartService, SizeQuantityItem } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { FavouritesService, FavouriteItem } from '../../../core/services/favourites.service';

/** Size string → backend enum integer (public enum Size in backend) */
const SIZE_MAP: Record<string, number> = {
  '2XS': 11, '_2XS': 11,
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

function sizeToEnum(sizeStr: string): number {
  const clean = sizeStr.replace(/^_/, '').toUpperCase().trim();
  return SIZE_MAP[clean] ?? SIZE_MAP['_' + clean] ?? (parseInt(clean, 10) || 0);
}

export interface SizeRow {
  size: string;       // display label e.g. "M"
  quantity: number;   // stock quantity
  cartQty: number;    // quantity the user wants to add to cart
}

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CustomerNavComponent, CustomerFooterComponent],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css'
})
export class ProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fixedProductService = inject(FixedProductService);
  private readonly cartService = inject(CartService);
  private readonly auth = inject(AuthService);
  private readonly favouritesService = inject(FavouritesService);

  // ── product state ──────────────────────────────────────────────
  loading = true;
  error = '';
  product: FixedProductDetail | null = null;
  colors: FixedProductColor[] = [];
  selectedColorId: number | null = null;
  colorDetail: FixedProductColorDetail | null = null;
  colorDetailLoading = false;

  // ── gallery ────────────────────────────────────────────────────
  mainImage: string | null = null;
  galleryImages: string[] = [];
  galleryIndex = 0;

  // ── cart / size modal ──────────────────────────────────────────
  showSizeModal = false;
  sizeRows: SizeRow[] = [];
  cartBusy = false;
  cartMessage = '';
  cartError = '';

  // ── size table modal ───────────────────────────────────────────
  showSizeTableModal = false;

  // ── favourites ─────────────────────────────────────────────────
  isInFavourites = false;
  favouriteLoading = false;
  favouriteMessage = '';
  favouriteError = '';

  // ── review state removed — backend only supports designed-product reviews ──
  isAuthenticated = false;

  ngOnInit(): void {
    this.isAuthenticated = !!this.auth.getToken();
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id || isNaN(id)) {
      this.loading = false;
      this.error = 'Invalid product ID';
      return;
    }
    this.loadProduct(id);
  }

  // ── Product loading ────────────────────────────────────────────

  private loadProduct(id: number): void {
    this.fixedProductService.getDetailsById(id).subscribe({
      next: product => {
        this.loading = false;
        if (!product) { this.error = 'Product not found'; return; }
        this.product = product;
        this.mainImage = product.imageUrl;
        this.colors = product.colors ?? [];
        if (this.colors.length > 0) {
          this.selectColor(this.colors[0].id);
        } else {
          this.galleryImages = product.imageUrl ? [product.imageUrl] : [];
        }
      },
      error: (err: unknown) => {
        this.loading = false;
        const msg = err instanceof Error ? err.message : '';
        this.error =
          msg?.trim() ||
          'Could not load this product. If the problem continues, try signing out and opening the page again.';
      }
    });
  }

  selectColor(colorId: number): void {
    this.selectedColorId = colorId;
    this.colorDetailLoading = true;
    this.fixedProductService.getColorById(colorId).subscribe({
      next: detail => {
        this.colorDetailLoading = false;
        this.colorDetail = detail;
        if (detail) {
          this.galleryImages = [];
          if (detail.imageUrl) this.galleryImages.push(detail.imageUrl);
          for (const img of detail.additionalImages) {
            if (img.imageUrl) this.galleryImages.push(img.imageUrl);
          }
          this.galleryIndex = 0;
          this.mainImage = this.galleryImages[0] ?? this.product?.imageUrl ?? null;
          // Build sizeRows for the cart modal
          this.sizeRows = detail.sizes.map(s => ({
            size: s.size,
            quantity: s.quantity,
            cartQty: 0
          }));
          // Check if this color is in favourites
          this.checkIfInFavourites();
        }
      },
      error: () => {
        this.colorDetailLoading = false;
      }
    });
  }

  selectGalleryImage(index: number): void {
    this.galleryIndex = index;
    this.mainImage = this.galleryImages[index] ?? null;
  }

  // ── Size modal / cart ──────────────────────────────────────────

  openSizeModal(): void {
    if (!this.isAuthenticated) { this.cartError = 'Please log in to add items to cart.'; return; }
    if (!this.colorDetail) return;
    // Reset qty each time
    this.sizeRows = this.colorDetail.sizes.map(s => ({ size: s.size, quantity: s.quantity, cartQty: 0 }));
    this.cartMessage = '';
    this.cartError = '';
    this.showSizeModal = true;
  }

  closeSizeModal(): void { this.showSizeModal = false; }

  changeQty(row: SizeRow, delta: number): void {
    const next = (row.cartQty ?? 0) + delta;
    row.cartQty = Math.max(0, Math.min(next, row.quantity));
  }

  totalCartItems(): number {
    return this.sizeRows.reduce((s, r) => s + r.cartQty, 0);
  }

  addToCart(): void {
    const lines = this.sizeRows.filter(r => r.cartQty > 0);
    if (lines.length === 0) { this.cartError = 'Please select at least one size.'; return; }
    if (!this.selectedColorId) return;

    this.cartBusy = true;
    this.cartError = '';
    this.cartMessage = '';

    // Build sizes array — all sizes in a single API call
    const sizesPayload: SizeQuantityItem[] = lines.map(row => ({
      size: sizeToEnum(row.size),
      quantity: row.cartQty
    }));

    this.cartService.addOrUpdateFixed({
      colorId: this.selectedColorId,
      sizes: sizesPayload
    }).subscribe({
      next: () => {
        this.cartBusy = false;
        this.cartMessage = '✓ Added to cart!';
        this.showSizeModal = false;
        setTimeout(() => this.cartMessage = '', 3000);
      },
      error: (e: Error) => {
        this.cartBusy = false;
        this.cartError = e.message || 'Failed to add to cart.';
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────────────

  audienceLabel(val: number | string): string {
    const n = typeof val === 'string' ? parseInt(val, 10) : val;
    const map: Record<number, string> = { 1: 'Men', 2: 'Women', 3: 'Unisex', 4: 'Kids', 8: 'Babies' };
    return map[n] ?? '';
  }

  dressStyleLabel(val: number | string): string {
    const n = typeof val === 'string' ? parseInt(val, 10) : val;
    const map: Record<number, string> = { 1: 'Casual', 2: 'Formal', 3: 'Party', 4: 'Gym', 5: 'Sporty' };
    return map[n] ?? '';
  }

  formatSize(s: string): string { return s.replace(/^_/, ''); }

  getSizeDetail(sizeString: string) {
    if (!this.product?.sizeDetails) return null;
    return this.product.sizeDetails.find(d =>
      d.size.toLowerCase() === sizeString.toLowerCase() ||
      this.formatSize(d.size).toLowerCase() === this.formatSize(sizeString).toLowerCase()
    ) || null;
  }

  starArray(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
  }

  formatDate(d: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // ── Size Table Modal ───────────────────────────────────────────

  openSizeTableModal(): void {
    this.showSizeTableModal = true;
  }

  closeSizeTableModal(): void {
    this.showSizeTableModal = false;
  }

  // ── Favourites ───────────────────────────────────────────────────

  toggleFavourite(): void {
    if (!this.isAuthenticated) {
      this.favouriteError = 'Please log in to add items to favourites.';
      return;
    }
    if (!this.selectedColorId) return;

    this.favouriteLoading = true;
    this.favouriteError = '';
    this.favouriteMessage = '';

    if (this.isInFavourites) {
      // Remove from favourites
      this.favouritesService.removeFromFavourites(this.selectedColorId).subscribe({
        next: success => {
          this.favouriteLoading = false;
          if (success) {
            this.isInFavourites = false;
            this.favouriteMessage = 'Removed from favourites';
            setTimeout(() => this.favouriteMessage = '', 3000);
          } else {
            this.favouriteError = 'Failed to remove from favourites';
          }
        },
        error: () => {
          this.favouriteLoading = false;
          this.favouriteError = 'Failed to remove from favourites';
        }
      });
    } else {
      // Add to favourites
      this.favouritesService.addToFavourites(this.selectedColorId).subscribe({
        next: success => {
          this.favouriteLoading = false;
          if (success) {
            this.isInFavourites = true;
            this.favouriteMessage = 'Added to favourites!';
            setTimeout(() => this.favouriteMessage = '', 3000);
          } else {
            this.favouriteError = 'Failed to add to favourites';
          }
        },
        error: () => {
          this.favouriteLoading = false;
          this.favouriteError = 'Failed to add to favourites';
        }
      });
    }
  }

  checkIfInFavourites(): void {
    if (!this.isAuthenticated || !this.selectedColorId) return;

    this.favouritesService.getAll().subscribe({
      next: response => {
        this.isInFavourites = response.items.some(f => f.fixedProductColorId === this.selectedColorId);
      },
      error: () => {
        this.isInFavourites = false;
      }
    });
  }
}
