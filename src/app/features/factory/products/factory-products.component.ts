import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DesignCatalogService } from '../../../core/services/design-catalog.service';
import {
  FactoryApiService,
  FactoryDesignedCatalogItem,
  FactoryDesignedCatalogPage,
  FactoryDesignedCatalogQuery,
  CategoryDto,
  DRESS_STYLE_OPTIONS,
  TARGET_AUDIENCE_OPTIONS
} from '../../../core/services/factory-api.service';

/** SortBy enum guesses — omit for API default sort. Adjust if backend documents differ. */
const CATALOG_SORT_OPTIONS: ReadonlyArray<{ label: string; value: number | null }> = [
  { label: 'Default', value: null },
  { label: 'Option 1', value: 1 },
  { label: 'Option 2', value: 2 },
  { label: 'Option 3', value: 3 },
  { label: 'Option 4', value: 4 },
  { label: 'Option 5', value: 5 },
  { label: 'Option 6', value: 6 },
  { label: 'Option 7', value: 7 },
  { label: 'Option 8', value: 8 }
];

@Component({
  selector: 'app-factory-products',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf, FormsModule],
  templateUrl: './factory-products.component.html'
})
export class FactoryProductsComponent implements OnInit {
  items: FactoryDesignedCatalogItem[] = [];
  pageMeta: Omit<FactoryDesignedCatalogPage, 'items'> | null = null;

  filters: FactoryDesignedCatalogQuery & { pageIndex: number; pageSize: number } = {
    pageIndex: 1,
    pageSize: 12,
    searchTerm: '',
    categoryId: null,
    minPrice: null,
    maxPrice: null,
    dressStyle: null,
    targetAudiences: null,
    sortBy: null
  };

  categories: CategoryDto[] = [];
  loading = false;
  loadError = '';
  deletingId: number | null = null;
  deleteError = '';

  readonly dressStyles = DRESS_STYLE_OPTIONS;
  readonly audiences = TARGET_AUDIENCE_OPTIONS;
  readonly sortOptions = CATALOG_SORT_OPTIONS;

  constructor(
    private readonly catalog: DesignCatalogService,
    private readonly factory: FactoryApiService
  ) {}

  ngOnInit(): void {
    this.factory.getCategories().subscribe({
      next: rows => {
        this.categories = rows ?? [];
      },
      error: () => {
        this.categories = [];
      }
    });
    this.refreshList();
  }

  refreshList(): void {
    this.deleteError = '';
    this.loadError = '';
    this.loading = true;
    const q: FactoryDesignedCatalogQuery = {
      pageIndex: this.filters.pageIndex,
      pageSize: this.filters.pageSize,
      searchTerm: this.filters.searchTerm?.trim() || null,
      categoryId: this.filters.categoryId,
      minPrice: this.filters.minPrice,
      maxPrice: this.filters.maxPrice,
      dressStyle: this.filters.dressStyle,
      targetAudiences: this.filters.targetAudiences,
      sortBy: this.filters.sortBy
    };
    this.factory.getDesignedProductsCatalog(q).subscribe({
      next: page => {
        this.items = page.items;
        this.pageMeta = {
          pageIndex: page.pageIndex,
          pageSize: page.pageSize,
          pages: page.pages,
          records: page.records
        };
        this.loading = false;
      },
      error: err => {
        this.loadError = err?.message || 'Failed to load products from server.';
        this.loading = false;
      }
    });
  }

  applyFiltersSubmit(event?: Event): void {
    event?.preventDefault?.();
    this.filters.pageIndex = 1;
    this.refreshList();
  }

  clearFilters(): void {
    this.filters = {
      pageIndex: 1,
      pageSize: this.filters.pageSize,
      searchTerm: '',
      categoryId: null,
      minPrice: null,
      maxPrice: null,
      dressStyle: null,
      targetAudiences: null,
      sortBy: null
    };
    this.refreshList();
  }

  get canPrevCatalogPage(): boolean {
    return !this.loading && this.filters.pageIndex > 1;
  }

  /** When API sends `pages`, respect it; otherwise infer from filled page slice. */
  get canNextCatalogPage(): boolean {
    if (this.loading) return false;
    const pgs = this.pageMeta?.pages ?? 0;
    if (pgs > 0) return this.filters.pageIndex < pgs;
    return this.items.length >= this.filters.pageSize;
  }

  goPrevPage(): void {
    if (!this.canPrevCatalogPage) return;
    this.filters.pageIndex -= 1;
    this.refreshList();
  }

  goNextPage(): void {
    if (!this.canNextCatalogPage) return;
    this.filters.pageIndex += 1;
    this.refreshList();
  }

  deleteProduct(item: FactoryDesignedCatalogItem): void {
    if (
      !confirm(
        `Delete "${item.name}" from the server? This cannot be undone.`
      )
    ) {
      return;
    }
    this.deleteError = '';
    this.deletingId = item.id;
    this.factory.deleteDesignedProduct(item.id).subscribe({
      next: () => {
        this.deletingId = null;
        this.catalog.unregisterDesignedProductId(item.id);
        this.items = this.items.filter(i => i.id !== item.id);
        this.refreshList();
      },
      error: (e: Error) => {
        this.deletingId = null;
        this.deleteError =
          e.message || 'Delete failed. The API may not support DELETE yet.';
      }
    });
  }

  /** Optional query for <a routerLink> so other browsers load the same template IDs. */
  get designStudioQueryParams(): { designedProductIds: string } | null {
    const ids = this.items.map(i => i.id);
    return ids.length
      ? { designedProductIds: ids.join(',') }
      : null;
  }
}
