import { AfterViewInit, Component, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CustomerNavComponent } from '../shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../shared/customer-footer/customer-footer.component';
import { DesignCatalogService } from '../../../core/services/design-catalog.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  CustomerDesignService,
  type AddCustomerDesignRequest
} from '../../../core/services/customer-design.service';
import {
  CartService,
  type AddOrUpdateDesignedToCartRequest
} from '../../../core/services/cart.service';
import {
  DesignReviewService,
  type DesignReview,
  type CreateReviewRequest
} from '../../../core/services/design-review.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-customer-design',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomerNavComponent, CustomerFooterComponent],
  templateUrl: './design.component.html',
  styleUrls: ['./design.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class CustomerDesignComponent implements AfterViewInit {
  catalogSearchResults: any[] = [];
  loadingProducts = false;
  searchParams: any = {
    SearchTerm: '',
    TargetAudience: null,
    DressStyle: null,
    PageIndex: 1,
    PageSize: 50
  };

  // Reviews
  selectedProductId: number | null = null;
  reviews: DesignReview[] = [];
  myReview: DesignReview | null = null;
  reviewsLoading = false;
  newReviewRating = 5;
  newReviewComment = '';
  reviewSubmitting = false;
  reviewError: string | null = null;
  reviewSuccess: string | null = null;
  showReviewForm = false;
  isAuthenticated = false;

  constructor(
    private readonly catalog: DesignCatalogService,
    private readonly auth: AuthService,
    private readonly route: ActivatedRoute,
    private readonly customerDesign: CustomerDesignService,
    private readonly cartService: CartService,
    private readonly reviewService: DesignReviewService,
    private readonly http: HttpClient
  ) {}

  ngAfterViewInit(): void {
    this.isAuthenticated = !!this.auth.getToken();
    const w = window as Window & {
      __WEARCAST_SAVE_CUSTOMER_DESIGN__?: (
        body: AddCustomerDesignRequest
      ) => Promise<number | null>;
      __WEARCAST_ADD_DESIGNED_TO_CART__?: (
        items: AddOrUpdateDesignedToCartRequest[]
      ) => Promise<void>;
      __WEARCAST_DESIGNS_STORAGE_KEY__?: string;
      wearcastOnProductChanged?: (baseProductId: number) => void;
    };
    w.__WEARCAST_DESIGNS_STORAGE_KEY__ =
      'wearcast_designs:' + this.auth.getCustomerLocalDesignsScope();
    if (this.auth.getToken()) {
      w.__WEARCAST_SAVE_CUSTOMER_DESIGN__ = body =>
        firstValueFrom(this.customerDesign.saveDesign(body));
      w.__WEARCAST_ADD_DESIGNED_TO_CART__ = async (
        items: AddOrUpdateDesignedToCartRequest[]
      ) => {
        const sendLines = async (
          lines: AddOrUpdateDesignedToCartRequest[]
        ): Promise<void> => {
          for (const item of lines) {
            if (item.quantity < 1) {
              continue;
            }
            await firstValueFrom(this.cartService.addOrUpdateDesigned(item));
          }
        };
        try {
          await sendLines(items);
        } catch (err) {
          console.error('Failed to add to cart:', err);
          throw err;
        }
      };
    } else {
      delete w.__WEARCAST_SAVE_CUSTOMER_DESIGN__;
      delete w.__WEARCAST_ADD_DESIGNED_TO_CART__;
    }

    // Connect product switching in designer to Angular reviews
    w.wearcastOnProductChanged = (baseProductId: number) => {
      this.selectedProductId = baseProductId;
      this.loadReviews(baseProductId);
    };

    const token = this.auth.getToken();
    const extraIds = this.parseDesignedProductIds(
      this.route.snapshot.queryParamMap.get('designedProductIds')
    );
    this.catalog.loadDesignerBootstrap(token, { extraProductIds: extraIds }).subscribe({
      next: boot => {
        const w = window as unknown as {
          __WEARCAST_DESIGNER_BOOTSTRAP__?: {
            products: Record<string, unknown>;
            colors: string[];
          };
        };
        if (boot.products && Object.keys(boot.products).length > 0) {
          w.__WEARCAST_DESIGNER_BOOTSTRAP__ = {
            products: boot.products as Record<string, unknown>,
            colors: boot.colors
          };
        }
        this.runDesigner();
        // Small delay to let the designer finish init, then search + sync images
        setTimeout(() => this.searchCatalog(), 300);
      },
      error: () => {
        this.runDesigner();
        setTimeout(() => this.searchCatalog(), 300);
      }
    });
  }

  searchCatalog(): void {
    this.loadingProducts = true;
    const url = `${environment.apiUrl}/api/customer/catalog/designed-products`;
    const params: any = { ...this.searchParams };

    // Clean nulls
    Object.keys(params).forEach(k => {
      if (params[k] === null || params[k] === '') {
        delete params[k];
      }
    });

    this.http.get<any>(url, { params }).subscribe({
      next: (res) => {
        this.loadingProducts = false;
        let arr = res;
        if (arr && typeof arr === 'object' && 'data' in arr) {
          arr = arr.data;
        }
        if (arr && typeof arr === 'object' && 'items' in arr) {
          arr = arr.items;
        }
        this.catalogSearchResults = (Array.isArray(arr) ? arr : (Array.isArray(res?.data) ? res.data : [])).map((item: any) => {
          let o = item || {};
          const nested = o.product || o.Product || o.designedProduct || o.DesignedProduct || {};
          o = { ...o, ...nested };
          return {
            ...o,
            id: o.id ?? o.Id ?? o.productId ?? o.ProductId ?? o.designedProductId ?? o.DesignedProductId,
            name: o.name ?? o.Name ?? o.productName ?? o.ProductName ?? o.title ?? o.Title ?? 'Product',
            imageUrl: o.imageUrl ?? o.ImageUrl ?? o.pictureUrl ?? o.PictureUrl ?? o.mainImage ?? o.MainImage ?? o.categoryImageUrl ?? (o.colors && o.colors[0] && o.colors[0].mainImageUrl) ?? null,
            price: o.price ?? o.Price ?? o.basePrice ?? o.BasePrice
          };
        });
        // Sync images from the designer's PRODUCTS registry
        setTimeout(() => this.syncImagesFromDesigner(), 500);
      },
      error: (err) => {
        this.loadingProducts = false;
        console.error('Failed to load catalog products', err);
      }
    });
  }

  selectCatalogProduct(item: any): void {
    const id = item?.id;
    if (!id) return;

    this.selectedProductId = id;
    this.loadReviews(id);

    const w = window as any;
    const productKey = `p${id}`;

    if (typeof w.wearcastGetProducts === 'function') {
      const products = w.wearcastGetProducts();
      if (products && products[productKey]) {
        if (typeof w.wearcastSetProduct === 'function') {
          w.wearcastSetProduct(productKey);
        }
        if (typeof w.wearcastCloseProductsModal === 'function') {
          w.wearcastCloseProductsModal();
        }
        return;
      }
    }

    window.location.href = `/customer/design?designedProductIds=${id}`;
  }

  loadReviews(productId: number): void {
    this.reviewsLoading = true;
    this.reviews = [];
    this.myReview = null;

    this.reviewService.getReviews(productId).subscribe(r => {
      this.reviews = r;
      this.reviewsLoading = false;
      this.updateSidePanelRating();
    });

    if (this.isAuthenticated) {
      this.reviewService.getMyReview(productId).subscribe(r => {
        this.myReview = r;
        if (r) { this.showReviewForm = false; }
      });
    }
  }

  submitReview(): void {
    if (!this.selectedProductId || !this.newReviewComment.trim()) return;
    this.reviewSubmitting = true;
    this.reviewError = null;
    const body: CreateReviewRequest = {
      rating: this.newReviewRating,
      comment: this.newReviewComment.trim()
    };
    this.reviewService.submitReview(this.selectedProductId, body).subscribe({
      next: () => {
        this.reviewSubmitting = false;
        this.reviewSuccess = this.myReview ? 'Review updated successfully!' : 'Review submitted successfully!';
        this.showReviewForm = false;
        this.newReviewComment = '';
        this.newReviewRating = 5;
        this.loadReviews(this.selectedProductId!);
        setTimeout(() => this.reviewSuccess = null, 3000);
      },
      error: (e: any) => {
        this.reviewSubmitting = false;
        this.reviewError = e?.error?.message || e?.error?.detail || 'Failed to submit review.';
      }
    });
  }

  editReview(): void {
    if (!this.myReview) return;
    // Pre-fill the form with existing review data
    this.newReviewRating = this.myReview.rating || 5;
    this.newReviewComment = this.myReview.comment || '';
    this.showReviewForm = true;
  }

  deleteReview(): void {
    if (!this.myReview) return;
    this.reviewService.deleteReview(this.myReview.reviewId).subscribe({
      next: () => {
        this.myReview = null;
        this.newReviewRating = 5;
        this.newReviewComment = '';
        this.showReviewForm = false;
        if (this.selectedProductId) this.loadReviews(this.selectedProductId);
      },
      error: () => {}
    });
  }

  updateSidePanelRating(): void {
    const el = document.getElementById('pd-rating');
    if (!el) return;
    const count = this.reviews.length;
    const avg = count > 0
      ? this.reviews.reduce((sum, r) => sum + r.rating, 0) / count
      : 5; // Default to 5 if no reviews

    // Create the stars string (e.g. 4 => ★★★★☆)
    const rounded = Math.round(avg);
    const stars = Array(rounded).fill('★').join('') + Array(5 - rounded).fill('☆').join('');

    el.innerHTML = `${stars} <span>(${count})</span>`;
    // Make sure the element is visible
    el.style.display = '';
  }

  starArray(n: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i < n ? 1 : 0);
  }

  scrollToReviews(event: Event): void {
    event.preventDefault();
    const section = document.querySelector('.reviews-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * After the designer runs, sync product images from the designer's PRODUCTS
   * registry into our Angular search results so they show real thumbnails.
   */
  syncImagesFromDesigner(): void {
    const w = window as any;
    if (typeof w.wearcastGetProducts !== 'function') return;
    const products = w.wearcastGetProducts();
    if (!products) return;

    this.catalogSearchResults = this.catalogSearchResults.map(item => {
      if (item.imageUrl) return item; // already has image
      const key = `p${item.id}`;
      const prod = products[key];
      if (!prod) return item;
      // Extract first available image from the product's images()
      const imgs = typeof prod.images === 'function' ? prod.images() : (prod.images || {});
      let imageUrl: string | null = null;
      for (const colorKey of Object.keys(imgs)) {
        const views = imgs[colorKey];
        if (views) {
          imageUrl = views.front || views.back || views.right || views.left || null;
          if (imageUrl) break;
        }
      }
      return { ...item, imageUrl };
    });
  }

  /** Comma-separated IDs, e.g. `?designedProductIds=12,34` so any browser can load templates without localStorage. */
  private parseDesignedProductIds(raw: string | null): number[] {
    if (!raw?.trim()) {
      return [];
    }
    return raw
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => Number.isFinite(n) && n > 0);
  }

  private runDesigner(): void {
    const w = window as any;
    if (typeof w.wearcastDesignerRun === 'function') {
      w.wearcastDesignerRun();
    } else {
      console.error('Wearcast designer script not loaded.');
    }
  }
}
