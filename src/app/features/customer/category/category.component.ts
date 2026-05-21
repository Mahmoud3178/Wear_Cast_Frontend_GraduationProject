import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CustomerNavComponent } from '../shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../shared/customer-footer/customer-footer.component';
import { FixedProductService, FixedProductSummary } from '../../../core/services/fixed-product.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CustomerNavComponent, CustomerFooterComponent],
  templateUrl: './category.component.html',
  styleUrl: './category.component.css'
})
export class CategoryComponent implements OnInit {
  private readonly fixedProductService = inject(FixedProductService);
  private readonly route = inject(ActivatedRoute);

  targetAudiences = [
    { label: 'Any', value: null },
    { label: 'Men', value: 1 },
    { label: 'Women', value: 2 },
    { label: 'Unisex', value: 3 },
    { label: 'Kids', value: 4 },
    { label: 'Babies', value: 8 }
  ];

  dressStyles = [
    { label: 'Any', value: null },
    { label: 'Casual', value: 1 },
    { label: 'Formal', value: 2 },
    { label: 'Party', value: 3 },
    { label: 'Gym', value: 4 },
    { label: 'Sporty', value: 5 }
  ];

  sortOptions = [
    { label: 'Most Popular', value: 'MostPopular' },
    { label: 'Newest', value: 'Newest' },
    { label: 'Price (Low to High)', value: 'PriceAsc' },
    { label: 'Price (High to Low)', value: 'PriceDesc' },
    { label: 'Best Seller', value: 'BestSeller' }
  ];

  categories: any[] = [];
  loadingCategories = false;

  selectedAudience: number | null = null;
  selectedStyle: number | null = null;
  selectedCategory: number | null = null;
  selectedSort: string | null = 'MostPopular';
  minPrice = 0;
  maxPrice = 99999;
  searchTerm = '';

  availableSizes = ['_XS', '_S', '_M', '_L', '_XL', '_2XL', '_3XL', '_4XL', '_5XL'];
  selectedSizes: string[] = [];

  pageIndex = 1;
  pageSize = 16;
  totalPages = 1;

  products: FixedProductSummary[] = [];
  totalCount = 0;
  loading = false;
  error = '';

  ngOnInit(): void {
    this.loadCategories();
    this.route.queryParamMap.subscribe(params => {
      const q = (params.get('q') || '').trim();
      if (q !== this.searchTerm) {
        this.searchTerm = q;
      }

      const sortRaw = (params.get('sort') || '').trim();
      if (sortRaw) {
        const normalized = this.normalizeSortParam(sortRaw);
        if (normalized) {
          this.selectedSort = normalized;
        }
      }

      const categoryIdRaw = params.get('categoryId');
      if (categoryIdRaw) {
        const id = parseInt(categoryIdRaw, 10);
        if (Number.isFinite(id) && id > 0) {
          this.selectedCategory = id;
        }
      } else {
        const categorySlug = (params.get('category') || '').trim();
        if (categorySlug && this.categories.length) {
          const resolved = this.resolveCategoryIdBySlug(categorySlug);
          if (resolved != null) {
            this.selectedCategory = resolved;
          }
        } else if (!categorySlug) {
          /* keep current category when only search/sort changed */
        }
      }

      this.fetchProducts(1);
    });
  }

  private normalizeSortParam(raw: string): string | null {
    const key = raw.replace(/\s+/g, '').toLowerCase();
    const map: Record<string, string> = {
      mostpopular: 'MostPopular',
      newest: 'Newest',
      priceasc: 'PriceAsc',
      pricedesc: 'PriceDesc',
      bestseller: 'BestSeller',
      bestSeller: 'BestSeller'
    };
    return map[key] ?? null;
  }

  /** Match home hero slugs to API category names (e.g. `t-shirts` → "T-Shirt"). */
  resolveCategoryIdBySlug(slug: string): number | null {
    const patterns: Record<string, string[]> = {
      't-shirts': ['t-shirt', 'tshirt', 't shirt', 'shirt'],
      hoodies: ['hoodie'],
      accessories: ['accessor', 'bag', 'tote'],
      sweatshirts: ['sweatshirt', 'sweat shirt', 'sweat', 'sweetshirt', 'sweet shirt', 'sweet'],
      'mugs-drinkwear': ['mug', 'drink'],
      'caps-hats': ['cap', 'hat']
    };
    const slugKey = slug.toLowerCase().trim();
    const needles = patterns[slugKey] ?? [slugKey.replace(/-/g, ' ')];
    const slugCompact = slugKey.replace(/[^a-z0-9]/g, '');
    for (const cat of this.categories) {
      const name = String(cat.name ?? cat.Name ?? '').toLowerCase();
      const nameCompact = name.replace(/[^a-z0-9]/g, '');
      if (needles.some(n => name.includes(n) || nameCompact.includes(n.replace(/[^a-z0-9]/g, '')))) {
        const id = cat.id ?? cat.Id;
        return typeof id === 'number' ? id : parseInt(String(id), 10) || null;
      }
      if (slugCompact.length >= 4 && nameCompact.includes(slugCompact.replace(/s$/, ''))) {
        const id = cat.id ?? cat.Id;
        return typeof id === 'number' ? id : parseInt(String(id), 10) || null;
      }
    }
    return null;
  }

  private readonly http = inject(HttpClient);

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
        this.applyCategorySlugFromRoute();
      },
      error: () => {
        this.loadingCategories = false;
        this.categories = [];
      }
    });
  }

  fetchProducts(page: number = 1): void {
    this.loading = true;
    this.error = '';
    this.pageIndex = page;

    const params: Record<string, any> = {
      PageIndex: this.pageIndex,
      PageSize: this.pageSize
    };

    // Only send price filters if the user actually changed them
    if (this.minPrice > 0) params['MinPrice'] = this.minPrice;
    if (this.maxPrice < 99999) params['MaxPrice'] = this.maxPrice;

    if (this.selectedAudience !== null) params['TargetAudience'] = this.selectedAudience;
    if (this.selectedStyle !== null) params['DressStyle'] = this.selectedStyle;
    if (this.selectedCategory !== null) params['CategoryId'] = this.selectedCategory;
    if (this.selectedSort !== null) params['SortBy'] = this.selectedSort;
    if (this.searchTerm.trim()) params['SearchTerm'] = this.searchTerm.trim();

    if (this.selectedSizes.length > 0) {
      params['Sizes'] = this.selectedSizes;
    }

    this.fixedProductService.getAll(params).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.products = res.items;
        this.totalCount = res.total ?? res.records ?? 0;
        this.totalPages =
          res.pages ?? Math.max(1, Math.ceil(this.totalCount / this.pageSize));
      },
      error: () => {
        this.loading = false;
        this.error = 'Failed to load products';
      }
    });
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.pageIndex) return;
    this.fetchProducts(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleSize(size: string): void {
    const idx = this.selectedSizes.indexOf(size);
    if (idx > -1) {
      this.selectedSizes.splice(idx, 1);
    } else {
      this.selectedSizes.push(size);
    }
    this.fetchProducts(1);
  }

  audienceLabel(val: number): string {
    const found = this.targetAudiences.find(a => a.value === val);
    return found?.label ?? '';
  }

  private applyCategorySlugFromRoute(): void {
    const slug = (this.route.snapshot.queryParamMap.get('category') || '').trim();
    if (!slug || this.route.snapshot.queryParamMap.get('categoryId')) {
      return;
    }
    const resolved = this.resolveCategoryIdBySlug(slug);
    if (resolved != null) {
      this.selectedCategory = resolved;
      this.fetchProducts(1);
    }
  }
}
