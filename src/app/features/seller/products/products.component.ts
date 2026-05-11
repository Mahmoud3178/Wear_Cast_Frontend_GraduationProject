import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {

  products: any[] = [];
  isLoading = false;

  searchText      = '';
  selectedCategory: number | null = null;
  minPrice: number | null = null;
  maxPrice: number | null = null;
  activeFilter: 'all' | 'low' | 'out' = 'all';

  stats = [
    { title: 'Total Products', value: 0, icon: 'bi-box-seam',         color: 'text-primary' },
    { title: 'Approved',       value: 0, icon: 'bi-check-circle',      color: 'text-success' },
    { title: 'Rejected',       value: 0, icon: 'bi-x-circle',          color: 'text-danger'  },
    { title: 'Low Stock',      value: 0, icon: 'bi-exclamation-circle', color: 'text-warning' }
  ];

  pageSize    = 8;
  currentPage = 1;

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadProducts();
  }

  // ── Stats from dedicated endpoint ──────────────────────
  loadStats() {
    this.productService.getSellerProductsStatus().subscribe({
      next: (res: any) => {
        this.stats[0].value = res.totalProducts ?? 0;
        this.stats[1].value = res.approved      ?? 0;
        this.stats[2].value = res.rejected      ?? 0;
        this.stats[3].value = res.lowStock      ?? 0;
      },
      error: () => {}
    });
  }

  // ── Products from seller endpoint ──────────────────────
  loadProducts() {
    this.isLoading = true;
    this.productService.getSellerProducts(1, 1000).subscribe({
      next: (res: any) => {
        this.products = (res?.items ?? []).map((p: any) => ({
          ...p,
          stockStatus: p.stock > 10 ? 'In Stock'
                     : p.stock > 0  ? 'Low Stock'
                     :                'Out of Stock',
          approval: p.isRejected ? 'Rejected' : 'Approved'
        }));
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  // ── Filtering (client-side) ────────────────────────────
  get filteredProducts(): any[] {
    let data = [...this.products];

    if (this.searchText)
      data = data.filter(p =>
        p.name.toLowerCase().includes(this.searchText.toLowerCase())
      );

    if (this.activeFilter === 'low')
      data = data.filter(p => p.stock > 0 && p.stock < 10);

    if (this.activeFilter === 'out')
      data = data.filter(p => p.stock === 0);

    if (this.minPrice != null)
      data = data.filter(p => p.price >= this.minPrice!);

    if (this.maxPrice != null)
      data = data.filter(p => p.price <= this.maxPrice!);

    if (this.selectedCategory === 1)
      data = data.filter(p => p.targetAudience === 'Men');
    else if (this.selectedCategory === 2)
      data = data.filter(p => p.targetAudience === 'Women');
    else if (this.selectedCategory === 3)
      data = data.filter(p => p.targetAudience === 'Kids');

    return data;
  }

  onFilterChange() { this.currentPage = 1; }

  setFilter(type: 'all' | 'low' | 'out') {
    this.activeFilter = type;
    this.currentPage  = 1;
  }

  // ── Counts for pills ───────────────────────────────────
  get lowStockCount():  number { return this.products.filter(p => p.stock > 0  && p.stock < 10).length; }
  get outOfStockCount():number { return this.products.filter(p => p.stock === 0).length; }

  // ── Pagination ─────────────────────────────────────────
  get totalPages(): number[] {
    return Array.from(
      { length: Math.max(1, Math.ceil(this.filteredProducts.length / this.pageSize)) },
      (_, i) => i + 1
    );
  }

  get startIndex(): number { return (this.currentPage - 1) * this.pageSize; }
  get endIndex():   number { return Math.min(this.startIndex + this.pageSize, this.filteredProducts.length); }
  get pagedProducts(): any[] { return this.filteredProducts.slice(this.startIndex, this.endIndex); }

  goToPage(page: number) { this.currentPage = page; }
  prevPage() { if (this.currentPage > 1)                      this.currentPage--; }
  nextPage() { if (this.currentPage < this.totalPages.length)  this.currentPage++; }
}
