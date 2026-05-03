import { Component, OnDestroy, OnInit, inject } from '@angular/core';
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
import { FavouritesService } from '../../../core/services/favourites.service';
import { TryOnService } from '../../../core/services/try-on.service';
import { environment } from '../../../../environments/environment';
import { parseWearCastApiDate } from '../../../core/utils/api-date';

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
export class ProductDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly fixedProductService = inject(FixedProductService);
  private readonly cartService = inject(CartService);
  private readonly auth = inject(AuthService);
  private readonly favouritesService = inject(FavouritesService);
  private readonly tryOnService = inject(TryOnService);

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

  // ── virtual try-on ─────────────────────────────────────────────
  showTryOnModal = false;
  tryOnPersonFile: File | null = null;
  tryOnBusy = false;
  tryOnError = '';
  tryOnProgress: number | null = null;
  tryOnStatusMessage = '';
  tryOnResultUrl: string | null = null;
  /** Fires once after ETA, then `/result/{task}` is fetched. */
  private tryOnResultDelayTimeout: ReturnType<typeof setTimeout> | null = null;
  /** When true, result callbacks no-op (success, error, or modal closed). */
  private tryOnPipelineDone = false;
  /** Ensures `/result/{task}` is invoked at most once for this run. */
  private tryOnResultFetched = false;
  /** `blob:` URL from try-on PNG response — revoked on modal close / new run. */
  private tryOnResultBlobRevokeUrl: string | null = null;

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

  ngOnDestroy(): void {
    this.clearTryOnPipeline();
    this.tryOnRevokeResultBlobUrl();
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
    const parsed = parseWearCastApiDate(d);
    if (!parsed) return d;
    return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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

  // ── Virtual try-on ─────────────────────────────────────────────

  canTryOn(): boolean {
    return !!(
      this.colorDetail &&
      !this.colorDetailLoading &&
      this.colorDetail.imageUrl &&
      String(this.colorDetail.imageUrl).trim()
    );
  }

  openTryOnModal(): void {
    this.tryOnRevokeResultBlobUrl();
    this.tryOnPersonFile = null;
    this.tryOnError = '';
    this.tryOnProgress = null;
    this.tryOnStatusMessage = '';
    this.tryOnResultUrl = null;
    this.tryOnBusy = false;
    this.tryOnResultFetched = false;
    this.clearTryOnPipeline();
    this.tryOnPipelineDone = false;
    this.showTryOnModal = true;
  }

  closeTryOnModal(): void {
    this.showTryOnModal = false;
    this.clearTryOnPipeline();
    this.tryOnBusy = false;
    this.tryOnPipelineDone = true;
    this.tryOnRevokeResultBlobUrl();
  }

  onTryOnPersonSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.tryOnPersonFile = file && file.type.startsWith('image/') ? file : null;
    if (file && !this.tryOnPersonFile) {
      this.tryOnError = 'Please choose an image file (JPG, PNG, etc.).';
    } else {
      this.tryOnError = '';
    }
  }

  startVirtualTryOn(): void {
    if (!this.canTryOn() || !this.colorDetail) {
      this.tryOnError = 'Select a color with a product photo first.';
      return;
    }
    if (!this.tryOnPersonFile) {
      this.tryOnError = 'Upload a photo of yourself.';
      return;
    }
    this.tryOnBusy = true;
    this.tryOnError = '';
    this.tryOnResultUrl = null;
    this.tryOnProgress = null;
    this.tryOnStatusMessage = 'Loading garment photo…';
    this.tryOnRevokeResultBlobUrl();
    this.tryOnResultFetched = false;
    this.tryOnPipelineDone = false;
    this.clearTryOnPipeline();

    this.fetchGarmentBlob(this.colorDetail.imageUrl)
      .then(garmentBlob => {
        const ext = guessExtFromUrl(this.colorDetail!.imageUrl);
        this.tryOnService
          .startTryOn(this.tryOnPersonFile!, garmentBlob, `garment.${ext}`)
          .subscribe({
            next: start => {
              this.scheduleTryOnResultAfterEta(start.taskId, start.estimatedSeconds);
            },
            error: (e: Error) => {
              this.tryOnBusy = false;
              this.tryOnError = e?.message || 'Try-on could not be started.';
            }
          });
      })
      .catch((e: Error) => {
        this.tryOnBusy = false;
        this.tryOnError =
          e?.message ||
          'Could not load the garment image. If this persists, the image host may block browser requests.';
      });
  }

  /** Cancel the ETA wait timer; does not revoke blob previews. */
  private clearTryOnPipeline(): void {
    if (this.tryOnResultDelayTimeout != null) {
      clearTimeout(this.tryOnResultDelayTimeout);
      this.tryOnResultDelayTimeout = null;
    }
  }

  private tryOnRevokeResultBlobUrl(): void {
    if (this.tryOnResultBlobRevokeUrl) {
      try {
        URL.revokeObjectURL(this.tryOnResultBlobRevokeUrl);
      } catch {
        /* ignore */
      }
      this.tryOnResultBlobRevokeUrl = null;
    }
  }

  private tryOnFinalizeSuccess(imageUrl: string): void {
    if (this.tryOnPipelineDone) return;
    this.tryOnPipelineDone = true;
    this.clearTryOnPipeline();
    this.tryOnBusy = false;
    this.tryOnRevokeResultBlobUrl();
    if (imageUrl.startsWith('blob:')) {
      this.tryOnResultBlobRevokeUrl = imageUrl;
    }
    this.tryOnResultUrl = imageUrl;
    this.tryOnStatusMessage = 'Done!';
    this.tryOnProgress = 100;
    this.tryOnError = '';
  }

  private tryOnFinalizeError(message: string): void {
    if (this.tryOnPipelineDone) return;
    this.tryOnPipelineDone = true;
    this.clearTryOnPipeline();
    this.tryOnBusy = false;
    this.tryOnError = message;
    this.tryOnProgress = null;
  }

  /**
   * Waits until the server's estimated runtime (plus a short buffer), then calls
   * GET /result/{task_id} exactly once — no `/stream` polling.
   */
  private scheduleTryOnResultAfterEta(taskId: string, estimatedSeconds: number | null): void {
    this.clearTryOnPipeline();
    this.tryOnResultFetched = false;
    if (this.tryOnPipelineDone) return;

    this.tryOnProgress = null;
    const etaSec = Math.max(1, estimatedSeconds ?? 90);
    this.tryOnStatusMessage = `Processing… (~${etaSec}s estimated)`;

    // Wait full ETA plus a small slack so the worker usually finishes before we hit /result once.
    const waitMs = Math.min(Math.max(etaSec * 1000 + 3000, 8000), 900_000);
    this.tryOnResultDelayTimeout = window.setTimeout(() => {
      if (this.tryOnPipelineDone || this.tryOnResultFetched) return;
      this.tryOnStatusMessage = 'Loading result…';
      this.fetchTryOnResultSingle(taskId);
    }, waitMs);
  }

  /** One GET /result call; clears ETA timer first. */
  private fetchTryOnResultSingle(taskId: string): void {
    if (this.tryOnPipelineDone || this.tryOnResultFetched) return;
    this.tryOnResultFetched = true;
    this.clearTryOnPipeline();

    this.tryOnService.getResultOnce(taskId).subscribe({
      next: res => {
        if (this.tryOnPipelineDone) return;
        const url = res.imageUrl ?? null;
        if (url) {
          this.tryOnFinalizeSuccess(url);
        } else {
          this.tryOnFinalizeError(
            'Try-on finished but the service did not return an image. Check the /result response format.'
          );
        }
      },
      error: (err: unknown) => {
        if (this.tryOnPipelineDone) return;
        const msg = err instanceof Error ? err.message : 'Could not load try-on result.';
        this.tryOnFinalizeError(msg);
      }
    });
  }

  private resolveProductImageUrl(raw: string): string {
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

  /**
   * URL for fetch() of garment bytes. In dev, API often returns absolute https://wear-cast.runasp.net/uploads/...
   * Direct fetch from localhost is CORS-blocked; strip host so the request goes to /uploads/... on the dev
   * server and is proxied (see proxy.conf.json).
   */
  private resolveGarmentFetchUrl(raw: string): string {
    const u = raw.trim();
    if (!u) return '';
    if (u.startsWith('data:')) return u;

    const apiBase = environment.apiUrl.replace(/\/$/, '');
    if (!apiBase) {
      try {
        const abs = u.startsWith('//')
          ? `${typeof window !== 'undefined' ? window.location.protocol : 'https:'}${u}`
          : u;
        if (/^https?:\/\//i.test(abs)) {
          const parsed = new URL(abs);
          if (parsed.hostname.toLowerCase() === 'wear-cast.runasp.net') {
            return parsed.pathname + parsed.search;
          }
        }
      } catch {
        /* use default resolution */
      }
    }

    return this.resolveProductImageUrl(raw);
  }

  private async fetchGarmentBlob(imageUrl: string): Promise<Blob> {
    const url = this.resolveGarmentFetchUrl(imageUrl);
    const res = await fetch(url, { credentials: 'omit' });
    if (!res.ok) {
      throw new Error(`Garment image HTTP ${res.status}`);
    }
    return res.blob();
  }
}

function guessExtFromUrl(url: string): string {
  const lower = url.split('?')[0].toLowerCase();
  if (lower.endsWith('.png')) return 'png';
  if (lower.endsWith('.webp')) return 'webp';
  if (lower.endsWith('.gif')) return 'gif';
  return 'jpg';
}
