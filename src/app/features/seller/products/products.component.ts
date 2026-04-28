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

  searchText: string = '';
  selectedCategory: number | null = null;
  minPrice: number | null = null;
  maxPrice: number | null = null;
activeFilter: 'all' | 'low' | 'out' = 'all';
  stats = [
    { title: 'Total Products', value: 0, icon: 'bi-box-seam', color: 'text-primary' },
    { title: 'Approved', value: 0, icon: 'bi-check-circle', color: 'text-success' },
    { title: 'Pending', value: 0, icon: 'bi-exclamation-circle', color: 'text-danger' },
    { title: 'Low Stock', value: 0, icon: 'bi-bag-fill', color: 'text-warning' }
  ];

  pageSize = 5;
  currentPage = 1;

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  // 🔥 مهم: لما أي فلتر يتغير
  onFilterChange() {
    this.currentPage = 1;
    this.loadProducts();
  }

  loadProducts() {
    this.isLoading = true;

    this.productService.getAll(
      this.currentPage,
      this.pageSize,
      this.searchText,
      this.selectedCategory ?? undefined,
      this.minPrice ?? undefined,
      this.maxPrice ?? undefined
    ).subscribe({
      next: (res: any) => {

        this.products = Array.isArray(res?.items) ? res.items : [];

        this.products = this.products.map(p => ({
          ...p,
          stockStatus: p.stock > 10 ? 'In Stock' :
                      (p.stock > 0 ? 'Low Stock' : 'Out of Stock'),
          approval: p.approval || 'Pending'
        }));

        this.stats[0].value = res?.records || this.products.length;
        this.stats[1].value = this.products.filter(p => p.approval === 'Approved').length;
        this.stats[2].value = this.products.filter(p => p.approval === 'Pending').length;
        this.stats[3].value = this.products.filter(p => p.stock < 10).length;

        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

get totalPages(): number[] {
  return Array.from(
    { length: Math.ceil(this.filteredProducts.length / this.pageSize) },
    (_, i) => i + 1
  );
}

get startIndex(): number {
  return (this.currentPage - 1) * this.pageSize;
}

get endIndex(): number {
  return Math.min(this.startIndex + this.pageSize, this.filteredProducts.length);
}

get pagedProducts(): any[] {
  return this.filteredProducts.slice(this.startIndex, this.endIndex);
}

  goToPage(page: number) {
    this.currentPage = page;
    this.loadProducts();
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadProducts();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages.length) {
      this.currentPage++;
      this.loadProducts();
    }
  }
get lowStockCount(): number {
  return this.products.filter(p => p.stock > 0 && p.stock < 10).length;
}

get outOfStockCount(): number {
  return this.products.filter(p => p.stock === 0).length;
}
setFilter(type: 'all' | 'low' | 'out') {
  this.activeFilter = type;
  this.currentPage = 1;
}
get filteredProducts(): any[] {

  let data = [...this.products];

  // search
  if (this.searchText) {
    data = data.filter(p =>
      p.name.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }

  // STOCK FILTER (المهم هنا)
  if (this.activeFilter === 'low') {
    data = data.filter(p => p.stock > 0 && p.stock < 10);
  }

  if (this.activeFilter === 'out') {
    data = data.filter(p => p.stock === 0);
  }

  return data;
}
}
