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
    { label: 'Most Popular', value: 0 },
    { label: 'Newest', value: 1 },
    { label: 'Price (Low to High)', value: 2 },
    { label: 'Price (High to Low)', value: 3 },
    { label: 'Best Seller', value: 4 }
  ];

  categories: any[] = [];
  loadingCategories = false;

  selectedAudience: number | null = null;
  selectedStyle: number | null = null;
  selectedCategory: number | null = null;
  selectedSort: number | null = 0;
  minPrice = 0;
  maxPrice = 99999;
  searchTerm = '';

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
      this.fetchProducts(1);
    });
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

  audienceLabel(val: number): string {
    const found = this.targetAudiences.find(a => a.value === val);
    return found?.label ?? '';
  }
}
