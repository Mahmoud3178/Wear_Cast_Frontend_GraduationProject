import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {

  products: any[] = [];
  isLoading = false;
  searchText: string = '';

  stats = [
    { title: 'Total Products', value: 0, icon: 'bi-box-seam', color: 'text-primary' },
    { title: 'Approved', value: 0, icon: 'bi-check-circle', color: 'text-success' },
    { title: 'Pending', value: 0, icon: 'bi-exclamation-circle', color: 'text-danger' },
    { title: 'Low Stock', value: 0, icon: 'bi-bag-fill', color: 'text-warning' }
  ];

  // pagination
  pageSize = 5;
  currentPage = 1;

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts() {
    this.isLoading = true;

    this.productService.getAll().subscribe({
      next: (res: any) => {
        // تأكد إن products مصفوفة
       this.products = Array.isArray(res?.items) ? res.items : [];

        // إضافة قيم افتراضية لو مش موجودة
        this.products = this.products.map(p => ({
          ...p,
          stockStatus: p.stock > 10 ? 'In Stock' : (p.stock > 0 ? 'Low Stock' : 'Out of Stock'),
          approval: p.approval || 'Pending',
          image: p.image || 'https://via.placeholder.com/40'
        }));

        // تحديث الإحصائيات
        this.stats[0].value = this.products.length;
        this.stats[1].value = this.products.filter(p => p.approval === 'Approved').length;
        this.stats[2].value = this.products.filter(p => p.approval === 'Pending').length;
        this.stats[3].value = this.products.filter(p => p.stock < 10).length;

        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  // Pagination logic
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

  // Filtered & paginated products
  get filteredProducts(): any[] {
    if (!Array.isArray(this.products)) return [];
    return this.products.filter(p =>
      p.name.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }

  get pagedProducts(): any[] {
    return this.filteredProducts.slice(this.startIndex, this.endIndex);
  }

  // Pagination controls
  goToPage(page: number) {
    this.currentPage = page;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage() {
    if (this.currentPage < this.totalPages.length) this.currentPage++;
  }
}
