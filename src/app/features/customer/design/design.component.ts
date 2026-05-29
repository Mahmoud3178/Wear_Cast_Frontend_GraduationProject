import { AfterViewInit, Component, OnDestroy, ViewEncapsulation, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CustomerNavComponent } from '../shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../shared/customer-footer/customer-footer.component';
import { VirtualTryOnModalComponent } from '../shared/virtual-try-on-modal/virtual-try-on-modal.component';
import { DesignCatalogService } from '../../../core/services/design-catalog.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  CustomerDesignService,
  type AddCustomerDesignRequest,
  type CustomerDesignSummary
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
import {
  DesignAssetsCatalogService,
  type DesignAssetCategoryRow,
  type DesignAssetRow
} from '../../../core/services/design-assets-catalog.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TryOnService } from '../../../core/services/try-on.service';

@Component({
  selector: 'app-customer-design',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CustomerNavComponent,
    CustomerFooterComponent,
    VirtualTryOnModalComponent
  ],
  templateUrl: './design.component.html',
  styleUrls: ['./design.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class CustomerDesignComponent implements AfterViewInit, OnDestroy {
  private readonly tryOnService = inject(TryOnService);
  catalogSearchResults: any[] = [];
  loadingProducts = false;
  initialProductsLoading = true;
  categories: any[] = [];
  loadingCategories = false;
  searchParams: any = {
    SearchTerm: '',
    TargetAudience: null,
    DressStyle: null,
    CategoryId: null,
    SortBy: null,
    MinPrice: '',
    MaxPrice: '',
    PageIndex: 1,
    PageSize: 8
  };
  totalProducts = 0;
  totalPages = 1;

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

  // Saved Designs (My Designs) pagination and search
  savedDesigns: CustomerDesignSummary[] = [];
  savedDesignsSearchTerm = '';
  savedDesignsPageIndex = 1;
  savedDesignsPageSize = 8;
  savedDesignsTotalCount = 0;
  savedDesignsTotalPages = 1;
  loadingSavedDesigns = false;
  savedDesignsModalMode: 'load' | 'update' = 'load';

  showTryOnModal = false;
  tryOnGarmentPreviewUrl: string | null = null;
  private tryOnGarmentPreviewRevoke: string | null = null;
  tryOnPersonFile: File | null = null;
  tryOnBusy = false;
  tryOnError = '';
  tryOnProgress: number | null = null;
  tryOnStatusMessage = '';
  tryOnResultUrl: string | null = null;
  private tryOnResultDelayTimeout: ReturnType<typeof setTimeout> | null = null;
  private tryOnPipelineDone = false;
  private tryOnResultFetched = false;
  private tryOnResultBlobRevokeUrl: string | null = null;

  constructor(
    private readonly catalog: DesignCatalogService,
    private readonly auth: AuthService,
    private readonly route: ActivatedRoute,
    private readonly customerDesign: CustomerDesignService,
    private readonly cartService: CartService,
    private readonly reviewService: DesignReviewService,
    private readonly http: HttpClient,
    private readonly designAssetsCatalog: DesignAssetsCatalogService
  ) {}

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
    this.isAuthenticated = !!this.auth.getToken();
    const w = window as Window & {
      __WEARCAST_SAVE_CUSTOMER_DESIGN__?: (
        body: AddCustomerDesignRequest
      ) => Promise<number | null>;
      __WEARCAST_UPDATE_CUSTOMER_DESIGN__?: (
        id: number,
        body: AddCustomerDesignRequest
      ) => Promise<void>;
      __WEARCAST_ADD_DESIGNED_TO_CART__?: (
        items: AddOrUpdateDesignedToCartRequest[]
      ) => Promise<void>;
      __WEARCAST_LIST_CUSTOMER_DESIGNS__?: (pageIndex?: number, pageSize?: number, searchTerm?: string) => Promise<{ items: CustomerDesignSummary[]; totalCount: number; totalPages: number }>;
      __WEARCAST_GET_CUSTOMER_DESIGN__?: (
        id: number
      ) => Promise<Record<string, unknown> | null>;
      __WEARCAST_DELETE_CUSTOMER_DESIGN__?: (id: number) => Promise<void>;
      __WEARCAST_LOAD_DESIGN_TO_CANVAS__?: (id: number) => Promise<void>;
      __WEARCAST_LOAD_DESIGN_ASSET_CATEGORIES__?: () => Promise<DesignAssetCategoryRow[]>;
      __WEARCAST_LOAD_DESIGN_ASSETS__?: (
        categoryId: number | null,
        pageIndex?: number,
        pageSize?: number,
        searchTerm?: string
      ) => Promise<any>;
      wearcastLoadDesignById?: (id: number) => void;
      wearcastOnProductChanged?: (baseProductId: number) => void;
      __WEARCAST_OPEN_SAVED_DESIGNS_MODAL__?: () => void;
      __WEARCAST_OPEN_UPDATE_DESIGN_SELECTOR__?: () => void;
      __WEARCAST_SET_UPDATE_TARGET__?: (id: number, name: string) => void;
      __WEARCAST_GENERATE_TRYON_GARMENT__?: () => Promise<Blob>;
    };

    w.__WEARCAST_LOAD_DESIGN_ASSET_CATEGORIES__ = async () =>
      firstValueFrom(this.designAssetsCatalog.getCategories());

    w.__WEARCAST_LOAD_DESIGN_ASSETS__ = async (
      categoryId: number | null,
      pageIndex = 1,
      pageSize = 12,
      searchTerm = ''
    ) =>
      firstValueFrom(
        this.designAssetsCatalog.getAssetsPaged(
          categoryId != null && categoryId > 0 ? categoryId : undefined,
          pageIndex,
          pageSize,
          searchTerm
        )
      );
    if (this.auth.getToken()) {
      // Updated save design function that accepts view images for the new draft API
      w.__WEARCAST_SAVE_CUSTOMER_DESIGN__ = async (body) => {
        // If view images are provided by the designer, include them in the request
        const raw = body as AddCustomerDesignRequest & Record<string, unknown>;
        const name =
          typeof raw.name === 'string' && raw.name.trim()
            ? raw.name.trim()
            : 'My design';
        const ac = raw.assetCount;
        const assetCount =
          typeof ac === 'number' && Number.isFinite(ac)
            ? Math.max(0, Math.floor(ac))
            : 0;
        const request: AddCustomerDesignRequest = {
          name,
          assetCount,
          productId: body.productId,
          productColorId: body.productColorId,
          viewDesignsJson: body.viewDesignsJson,
          frontImage: raw.frontImage as AddCustomerDesignRequest['frontImage'],
          backImage: raw.backImage as AddCustomerDesignRequest['backImage'],
          leftImage: raw.leftImage as AddCustomerDesignRequest['leftImage'],
          rightImage: raw.rightImage as AddCustomerDesignRequest['rightImage']
        };
        return firstValueFrom(this.customerDesign.saveDesign(request));
      };

      w.__WEARCAST_UPDATE_CUSTOMER_DESIGN__ = async (id: number, body) => {
        const raw = body as AddCustomerDesignRequest & Record<string, unknown>;
        const name =
          typeof raw.name === 'string' && raw.name.trim()
            ? raw.name.trim()
            : 'My design';
        const ac = raw.assetCount;
        const assetCount =
          typeof ac === 'number' && Number.isFinite(ac)
            ? Math.max(0, Math.floor(ac))
            : 0;
        const request: AddCustomerDesignRequest = {
          name,
          assetCount,
          productId: body.productId,
          productColorId: body.productColorId,
          viewDesignsJson: body.viewDesignsJson,
          frontImage: raw.frontImage as AddCustomerDesignRequest['frontImage'],
          backImage: raw.backImage as AddCustomerDesignRequest['backImage'],
          leftImage: raw.leftImage as AddCustomerDesignRequest['leftImage'],
          rightImage: raw.rightImage as AddCustomerDesignRequest['rightImage']
        };
        await firstValueFrom(this.customerDesign.updateDesign(id, request));
      };

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

      w.__WEARCAST_LIST_CUSTOMER_DESIGNS__ = async (pageIndex = 1, pageSize = 8, searchTerm = '') =>
        firstValueFrom(this.customerDesign.listMyDesigns(pageIndex, pageSize, searchTerm));

      w.__WEARCAST_GET_CUSTOMER_DESIGN__ = async (id: number) =>
        firstValueFrom(this.customerDesign.getMyDesignById(id));

      w.__WEARCAST_DELETE_CUSTOMER_DESIGN__ = async (id: number) => {
        await firstValueFrom(this.customerDesign.deleteMyDesign(id));
      };

      w.__WEARCAST_LOAD_DESIGN_TO_CANVAS__ = async (id: number) => {
        if (typeof w.wearcastLoadDesignById !== 'function') {
          throw new Error('Designer loader is not ready yet.');
        }
        w.wearcastLoadDesignById(id);
      };

      // Open saved designs modal and load designs
      w.__WEARCAST_OPEN_SAVED_DESIGNS_MODAL__ = () => {
        // Reset pagination and search
        this.savedDesignsModalMode = 'load';
        this.savedDesignsPageIndex = 1;
        this.savedDesignsSearchTerm = '';
        // Load designs
        this.loadSavedDesigns();
        // Open modal (vanilla JS will handle the display)
        const modal = document.getElementById('load-modal');
        if (modal) {
          modal.classList.remove('hidden');
        }
      };

      // Open modal for selecting which design to update
      w.__WEARCAST_OPEN_UPDATE_DESIGN_SELECTOR__ = () => {
        // Reset pagination and search
        this.savedDesignsModalMode = 'update';
        this.savedDesignsPageIndex = 1;
        this.savedDesignsSearchTerm = '';
        // Load designs
        this.loadSavedDesigns();
        // Open modal
        const modal = document.getElementById('load-modal');
        if (modal) {
          modal.classList.remove('hidden');
        }
      };
    } else {
      delete w.__WEARCAST_SAVE_CUSTOMER_DESIGN__;
      delete w.__WEARCAST_UPDATE_CUSTOMER_DESIGN__;
      delete w.__WEARCAST_ADD_DESIGNED_TO_CART__;
      delete w.__WEARCAST_LIST_CUSTOMER_DESIGNS__;
      delete w.__WEARCAST_GET_CUSTOMER_DESIGN__;
      delete w.__WEARCAST_DELETE_CUSTOMER_DESIGN__;
      delete w.__WEARCAST_OPEN_SAVED_DESIGNS_MODAL__;
      delete w.__WEARCAST_OPEN_UPDATE_DESIGN_SELECTOR__;
      delete w.__WEARCAST_LOAD_DESIGN_TO_CANVAS__;
      delete w.__WEARCAST_SET_UPDATE_TARGET__;
    }

    // Connect product switching in designer to Angular reviews
    w.wearcastOnProductChanged = (baseProductId: number) => {
      this.selectedProductId = baseProductId;
      this.loadReviews(baseProductId);
    };

    // Load categories for filter
    this.loadCategories();

    const token = this.auth.getToken();
    const extraIds = this.parseDesignedProductIds(
      this.route.snapshot.queryParamMap.get('designedProductIds')
    );
    const draftDesignId = this.parsePositiveInt(
      this.route.snapshot.queryParamMap.get('designId')
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
        if (draftDesignId != null) {
          setTimeout(() => this.loadDraftDesign(draftDesignId), 700);
        }
        if (extraIds && extraIds.length > 0) {
          setTimeout(() => this.selectCatalogProduct({ id: extraIds[0] }), 1000);
        }
        // Small delay to let the designer finish init, then search + sync images
        setTimeout(() => this.searchCatalog(), 300);
      },
      error: () => {
        this.runDesigner();
        if (draftDesignId != null) {
          setTimeout(() => this.loadDraftDesign(draftDesignId), 700);
        }
        if (extraIds && extraIds.length > 0) {
          setTimeout(() => this.selectCatalogProduct({ id: extraIds[0] }), 1000);
        }
        setTimeout(() => this.searchCatalog(), 300);
      }
    });
  }

  loadCategories(): void {
    this.loadingCategories = true;
    const url = `${environment.apiUrl}/api/Category/GetAllCategories`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.loadingCategories = false;
        let arr = res;
        if (arr && typeof arr === 'object' && 'data' in arr) {
          arr = arr.data;
        }
        if (arr && typeof arr === 'object' && 'items' in arr) {
          arr = arr.items;
        }
        if (arr && typeof arr === 'object' && 'categories' in arr) {
          arr = arr.categories;
        }
        this.categories = Array.isArray(arr) ? arr : [];
      },
      error: () => {
        this.loadingCategories = false;
        this.categories = [];
      }
    });
  }

  searchCatalog(): void {
    this.loadingProducts = true;
    const url = `${environment.apiUrl}/api/customer/catalog/designed-products`;
    
    // Construct query parameters supporting multiple casings and naming conventions
    const params: any = {};
    Object.keys(this.searchParams).forEach(k => {
      const v = this.searchParams[k];
      if (v !== null && v !== '') {
        params[k] = v;
        // Duplicate key as camelCase
        const camelKey = k.charAt(0).toLowerCase() + k.slice(1);
        if (camelKey !== k) {
          params[camelKey] = v;
        }
      }
    });

    // Explicitly add common pagination parameter variations
    if (this.searchParams.PageIndex !== undefined) {
      params['pageIndex'] = this.searchParams.PageIndex;
      params['pageNumber'] = this.searchParams.PageIndex;
      params['page'] = this.searchParams.PageIndex;
    }
    if (this.searchParams.PageSize !== undefined) {
      params['pageSize'] = this.searchParams.PageSize;
      params['limit'] = this.searchParams.PageSize;
    }

    this.http.get<any>(url, { params }).subscribe({
      next: (res) => {
        this.loadingProducts = false;
        this.initialProductsLoading = false;
        
        let arr = res;
        let responseData = res;
        if (arr && typeof arr === 'object' && 'data' in arr) {
          responseData = arr.data;
          arr = responseData.items || responseData;
        }
        if (arr && typeof arr === 'object' && 'items' in arr) {
          arr = arr.items;
        }
        
        // Extract total count and total pages robustly using all common backend API keys
        const tc = responseData?.totalCount ?? responseData?.total ?? responseData?.records ?? responseData?.totalRecords ?? responseData?.count;
        this.totalProducts = typeof tc === 'number' ? tc : (Array.isArray(arr) ? arr.length : 0);

        const tp = responseData?.totalPages ?? responseData?.pages ?? responseData?.totalPagesCount;
        this.totalPages = typeof tp === 'number' ? tp : Math.ceil(this.totalProducts / this.searchParams.PageSize) || 1;

        this.catalogSearchResults = (Array.isArray(arr) ? arr : (Array.isArray(res?.data) ? res.data : [])).map((item: any) => {
          let o = item || {};
          const nested = o.product || o.Product || o.designedProduct || o.DesignedProduct || {};
          o = { ...o, ...nested };

          // Get front-view image from colors array if available
          let frontImageUrl: string | null = null;
          const colors = o.colors || o.Colors || o.productColors || o.ProductColors || [];
          if (Array.isArray(colors) && colors.length > 0) {
            const firstColor = colors[0];
            const colorImages = firstColor.images || firstColor.Images || firstColor.productImages || firstColor.ProductImages || [];
            if (Array.isArray(colorImages)) {
              // Find front view image
              const frontImage = colorImages.find((img: any) => {
                const viewSide = img.viewSide || img.ViewSide || img.side || img.Side || img.view || img.View;
                return viewSide === 1 || viewSide === 'Front' || viewSide === 'front' || viewSide === 0;
              });
              if (frontImage) {
                frontImageUrl = frontImage.imageUrl || frontImage.ImageUrl || frontImage.url || frontImage.Url || null;
              }
              // Fallback to first image if no front view found
              if (!frontImageUrl && colorImages.length > 0) {
                frontImageUrl = colorImages[0].imageUrl || colorImages[0].ImageUrl || colorImages[0].url || colorImages[0].Url || null;
              }
            }
            // Try mainImageUrl on color
            if (!frontImageUrl) {
              frontImageUrl = firstColor.mainImageUrl || firstColor.MainImageUrl || firstColor.imageUrl || firstColor.ImageUrl || null;
            }
          }

          return {
            ...o,
            id: o.id ?? o.Id ?? o.productId ?? o.ProductId ?? o.designedProductId ?? o.DesignedProductId,
            name: o.name ?? o.Name ?? o.productName ?? o.ProductName ?? o.title ?? o.Title ?? 'Product',
            imageUrl: frontImageUrl ?? o.imageUrl ?? o.ImageUrl ?? o.mainImageUrl ?? o.MainImageUrl ?? o.pictureUrl ?? o.PictureUrl ?? o.mainImage ?? o.MainImage ?? o.categoryImageUrl ?? null,
            price: o.price ?? o.Price ?? o.basePrice ?? o.BasePrice,
            averageRating:
              o.averageRating ??
              o.AverageRating ??
              o.rating ??
              o.Rating ??
              null,
            reviewCount:
              o.reviewCount ??
              o.ReviewCount ??
              o.ratingsCount ??
              o.RatingsCount ??
              o.totalReviews ??
              o.TotalReviews ??
              0,
            targetAudienceLabel:
              this.getTargetAudienceLabel(
                o.targetAudienceName ??
                  o.TargetAudienceName ??
                  o.targetAudience ??
                  o.TargetAudience ??
                  o.targetAudiences ??
                  o.TargetAudiences
              )
          };
        });
        const validIds = new Set(
          this.catalogSearchResults.map((r: { id?: number }) => r.id).filter((id): id is number => typeof id === 'number' && id > 0)
        );
        if (this.selectedProductId != null && !validIds.has(this.selectedProductId)) {
          const firstId = this.catalogSearchResults[0]?.id;
          if (typeof firstId === 'number' && firstId > 0) {
            this.selectedProductId = firstId;
            this.loadReviews(firstId);
          } else {
            this.selectedProductId = null;
            this.reviews = [];
            this.myReview = null;
            this.reviewsLoading = false;
          }
        }
        // Sync images from the designer's PRODUCTS registry
        setTimeout(() => this.syncImagesFromDesigner(), 500);
      },
      error: (err) => {
        this.loadingProducts = false;
        this.initialProductsLoading = false;
        console.error('Failed to load catalog products', err);
      }
    });
  }

  // Pagination methods
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.searchParams.PageIndex) return;
    this.searchParams.PageIndex = page;
    this.searchCatalog();
  }

  nextPage(): void {
    if (this.searchParams.PageIndex < this.totalPages) {
      this.searchParams.PageIndex++;
      this.searchCatalog();
    }
  }

  prevPage(): void {
    if (this.searchParams.PageIndex > 1) {
      this.searchParams.PageIndex--;
      this.searchCatalog();
    }
  }

  selectCatalogProduct(item: any): void {
    const id = item?.id;
    if (!id) return;

    this.selectedProductId = id;
    this.loadReviews(id);

    const w = window as Window & {
      wearcastGetProducts?: () => Record<string, unknown>;
      wearcastSetProduct?: (productKey: string) => void;
      wearcastCloseProductsModal?: () => void;
      wearcastMergeBootstrap?: (boot: { products: Record<string, unknown>; colors: string[] }) => void;
    };
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

    // Product wasn't in the live registry; fetch and merge it without reloading the page.
    const token = this.auth.getToken();
    this.catalog.loadDesignerBootstrap(token, { extraProductIds: [id] }).subscribe({
      next: boot => {
        if (typeof w.wearcastMergeBootstrap === 'function') {
          w.wearcastMergeBootstrap(boot as { products: Record<string, unknown>; colors: string[] });
        } else {
          const bootstrapWindow = window as Window & {
            __WEARCAST_DESIGNER_BOOTSTRAP__?: { products: Record<string, unknown>; colors: string[] };
          };
          bootstrapWindow.__WEARCAST_DESIGNER_BOOTSTRAP__ = {
            products: boot.products as Record<string, unknown>,
            colors: boot.colors
          };
        }

        if (typeof w.wearcastSetProduct === 'function') {
          w.wearcastSetProduct(productKey);
        }
        if (typeof w.wearcastCloseProductsModal === 'function') {
          w.wearcastCloseProductsModal();
        }
      },
      error: err => {
        console.error('Failed to switch product without reload:', err);
        alert('Could not load this product right now. Please try again.');
      }
    });
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
        // Handle API error structure: { isSuccess, statusCode, error: { code, description } }
        const apiErrorDesc = e?.error?.error?.description;
        const apiErrorDetail = e?.error?.detail;
        const apiErrorMessage = e?.error?.message;
        this.reviewError = apiErrorDesc || apiErrorDetail || apiErrorMessage || 'Failed to submit review.';
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
   * Prioritizes front-view images from the API/designer over main images.
   */
  syncImagesFromDesigner(): void {
    const w = window as any;
    if (typeof w.wearcastGetProducts !== 'function') return;
    const products = w.wearcastGetProducts();
    if (!products) return;

    this.catalogSearchResults = this.catalogSearchResults.map(item => {
      const key = `p${item.id}`;
      const prod = products[key];
      if (!prod) return item;

      // Extract front-view image from the designer's product images
      const imgs = typeof prod.images === 'function' ? prod.images() : (prod.images || {});
      let frontImageUrl: string | null = null;

      for (const colorKey of Object.keys(imgs)) {
        const views = imgs[colorKey];
        if (views && views.front) {
          frontImageUrl = views.front;
          break; // Found front view, use it
        }
      }

      // If no front view found, fall back to any available view
      if (!frontImageUrl) {
        for (const colorKey of Object.keys(imgs)) {
          const views = imgs[colorKey];
          if (views) {
            frontImageUrl = views.front || views.back || views.right || views.left || null;
            if (frontImageUrl) break;
          }
        }
      }

      // Always prefer front image from designer over API main image
      return { ...item, imageUrl: frontImageUrl || item.imageUrl };
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

  private parsePositiveInt(raw: string | null): number | null {
    if (!raw?.trim()) {
      return null;
    }
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private loadDraftDesign(designId: number): void {
    const w = window as Window & {
      wearcastLoadDesignById?: (id: number) => void;
    };
    if (typeof w.wearcastLoadDesignById === 'function') {
      w.wearcastLoadDesignById(designId);
    }
  }

  private getTargetAudienceLabel(value: unknown): string {
    const map: Record<number, string> = {
      1: 'Men',
      2: 'Women',
      3: 'Unisex',
      4: 'Kids',
      8: 'Babies'
    };
    if (Array.isArray(value)) {
      const labels = value
        .map(v => this.getTargetAudienceLabel(v))
        .filter(Boolean)
        .filter(v => v !== 'All');
      return labels.length ? [...new Set(labels)].join(', ') : 'All';
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return 'All';
      const maybeNum = Number(trimmed);
      if (!Number.isNaN(maybeNum) && map[maybeNum]) return map[maybeNum];
      return trimmed;
    }
    if (typeof value === 'number' && map[value]) {
      return map[value];
    }
    return 'All';
  }

  // Saved designs search and pagination methods
  searchSavedDesigns(): void {
    this.savedDesignsPageIndex = 1;
    this.loadSavedDesigns();
  }

  loadSavedDesigns(): void {
    this.loadingSavedDesigns = true;
    this.customerDesign.listMyDesigns(
      this.savedDesignsPageIndex,
      this.savedDesignsPageSize,
      this.savedDesignsSearchTerm
    ).subscribe({
      next: result => {
        this.savedDesigns = result.items;
        this.savedDesignsTotalCount = result.totalCount;
        this.savedDesignsTotalPages = result.totalPages;
        this.loadingSavedDesigns = false;
      },
      error: () => {
        this.savedDesigns = [];
        this.loadingSavedDesigns = false;
      }
    });
  }

  goToSavedDesignsPage(page: number): void {
    if (page < 1 || page > this.savedDesignsTotalPages || page === this.savedDesignsPageIndex) return;
    this.savedDesignsPageIndex = page;
    this.loadSavedDesigns();
  }

  nextSavedDesignsPage(): void {
    if (this.savedDesignsPageIndex < this.savedDesignsTotalPages) {
      this.savedDesignsPageIndex++;
      this.loadSavedDesigns();
    }
  }

  prevSavedDesignsPage(): void {
    if (this.savedDesignsPageIndex > 1) {
      this.savedDesignsPageIndex--;
      this.loadSavedDesigns();
    }
  }

  onLoadDesign(designId: number): void {
    // Use the window global function to load design into canvas
    const w = window as Window & {
      __WEARCAST_LOAD_DESIGN_TO_CANVAS__?: (id: number) => Promise<void>;
    };
    if (w.__WEARCAST_LOAD_DESIGN_TO_CANVAS__) {
      w.__WEARCAST_LOAD_DESIGN_TO_CANVAS__(designId).then(() => {
        // Close the modal after loading
        const loadModal = document.getElementById('load-modal');
        if (loadModal) {
          loadModal.classList.add('hidden');
        }
      }).catch((err) => {
        console.error('Failed to load design into canvas:', err);
        alert('Could not load the selected design. Please try again.');
      });
    }
  }

  onSavedDesignPrimaryAction(design: CustomerDesignSummary): void {
    if (this.savedDesignsModalMode === 'update') {
      const w = window as Window & {
        __WEARCAST_SET_UPDATE_TARGET__?: (id: number, name: string) => void;
      };
      if (typeof w.__WEARCAST_SET_UPDATE_TARGET__ === 'function') {
        w.__WEARCAST_SET_UPDATE_TARGET__(design.id, design.name || `Design #${design.id}`);
      }
      const loadModal = document.getElementById('load-modal');
      if (loadModal) {
        loadModal.classList.add('hidden');
      }
      return;
    }
    this.onLoadDesign(design.id);
  }

  onDeleteDesign(designId: number): void {
    if (!confirm('Are you sure you want to delete this design?')) return;

    this.customerDesign.deleteMyDesign(designId).subscribe({
      next: () => {
        // Remove from local list and reload
        this.savedDesigns = this.savedDesigns.filter(d => d.id !== designId);
        this.savedDesignsTotalCount--;
        // Reload if current page is now empty
        if (this.savedDesigns.length === 0 && this.savedDesignsPageIndex > 1) {
          this.savedDesignsPageIndex--;
        }
        this.loadSavedDesigns();
      },
      error: (err) => {
        console.error('Failed to delete design:', err);
        alert('Failed to delete design. Please try again.');
      }
    });
  }

  ngOnDestroy(): void {
    this.clearTryOnPipeline();
    this.tryOnRevokeResultBlobUrl();
    this.revokeTryOnGarmentPreview();
  }

  canTryOn(): boolean {
    const img = document.getElementById('product-image') as HTMLImageElement | null;
    const src = img?.src?.trim() || '';
    return !!src && !src.includes('hoodie-front.jpg');
  }

  openTryOnModal(): void {
    this.revokeTryOnGarmentPreview();
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
    this.refreshTryOnGarmentPreview();
  }

  closeTryOnModal(): void {
    this.showTryOnModal = false;
    this.clearTryOnPipeline();
    this.tryOnBusy = false;
    this.tryOnPipelineDone = true;
    this.tryOnRevokeResultBlobUrl();
    this.revokeTryOnGarmentPreview();
  }

  private revokeTryOnGarmentPreview(): void {
    if (this.tryOnGarmentPreviewRevoke) {
      try {
        URL.revokeObjectURL(this.tryOnGarmentPreviewRevoke);
      } catch {
        /* ignore */
      }
      this.tryOnGarmentPreviewRevoke = null;
    }
    this.tryOnGarmentPreviewUrl = null;
  }

  private refreshTryOnGarmentPreview(): void {
    const fn = (window as Window & { __WEARCAST_GENERATE_TRYON_GARMENT__?: () => Promise<Blob> })
      .__WEARCAST_GENERATE_TRYON_GARMENT__;
    if (typeof fn !== 'function') return;
    fn()
      .then(blob => {
        this.revokeTryOnGarmentPreview();
        const url = URL.createObjectURL(blob);
        this.tryOnGarmentPreviewRevoke = url;
        this.tryOnGarmentPreviewUrl = url;
      })
      .catch(() => {
        this.tryOnGarmentPreviewUrl = null;
      });
  }

  onTryOnPersonSelected(file: File | null): void {
    this.tryOnPersonFile = file;
    this.tryOnError =
      file === null && this.showTryOnModal
        ? 'Please choose an image file (JPG, PNG, etc.).'
        : '';
  }

  startVirtualTryOn(): void {
    if (!this.tryOnPersonFile) {
      this.tryOnError = 'Upload a photo of yourself.';
      return;
    }
    const fn = (window as Window & { __WEARCAST_GENERATE_TRYON_GARMENT__?: () => Promise<Blob> })
      .__WEARCAST_GENERATE_TRYON_GARMENT__;
    if (typeof fn !== 'function') {
      this.tryOnError = 'Designer is still loading. Please wait and try again.';
      return;
    }
    this.tryOnBusy = true;
    this.tryOnError = '';
    this.tryOnResultUrl = null;
    this.tryOnProgress = null;
    this.tryOnStatusMessage = 'Rendering your design on the garment…';
    this.tryOnRevokeResultBlobUrl();
    this.tryOnResultFetched = false;
    this.tryOnPipelineDone = false;
    this.clearTryOnPipeline();

    fn()
      .then(garmentBlob => {
        this.tryOnStatusMessage = 'Starting try-on…';
        this.tryOnService
          .startTryOn(this.tryOnPersonFile!, garmentBlob, 'garment.png')
          .subscribe({
            next: start => this.scheduleTryOnResultAfterEta(start.taskId, start.estimatedSeconds),
            error: (e: Error) => {
              this.tryOnBusy = false;
              this.tryOnError = e?.message || 'Try-on could not be started.';
            }
          });
      })
      .catch((e: Error) => {
        this.tryOnBusy = false;
        this.tryOnError =
          e?.message || 'Could not render your design preview. Add a product and try again.';
      });
  }

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

  private scheduleTryOnResultAfterEta(taskId: string, estimatedSeconds: number | null): void {
    this.clearTryOnPipeline();
    this.tryOnResultFetched = false;
    if (this.tryOnPipelineDone) return;
    this.tryOnProgress = null;
    const etaSec = Math.max(1, estimatedSeconds ?? 90);
    this.tryOnStatusMessage = `Processing… (~${etaSec}s estimated)`;
    const waitMs = Math.min(Math.max(etaSec * 1000 + 3000, 8000), 900_000);
    this.tryOnResultDelayTimeout = window.setTimeout(() => {
      if (this.tryOnPipelineDone || this.tryOnResultFetched) return;
      this.tryOnStatusMessage = 'Loading result…';
      this.fetchTryOnResultSingle(taskId);
    }, waitMs);
  }

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
            'Try-on finished but the service did not return an image.'
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
}
