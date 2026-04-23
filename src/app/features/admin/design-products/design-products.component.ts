import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminDesignProductsService } from '../../../core/services/admin-design-products.service';

@Component({
  selector: 'app-design-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './design-products.component.html',
  styleUrl: './design-products.component.css'
})
export class DesignProductsComponent implements OnInit {

  products: any[] = [];
  searchTerm = '';
  currentPage = 1;
  pageSize = 5;
  totalCount = 0;

  constructor(private service: AdminDesignProductsService) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts() {
    this.service.getAllDesignedProducts(
      this.currentPage,
      this.pageSize,
      this.searchTerm
    ).subscribe({
      next: (res: any) => {

        const data = res?.data;

        this.products = data?.items || [];
        this.totalCount = data?.records || 0;
      },
      error: (err) => console.error(err)
    });
  }

  applyFilter() {
    this.currentPage = 1;
    this.loadProducts();
  }

  get totalPages(): number[] {
    return Array.from(
      { length: Math.ceil(this.totalCount / this.pageSize) },
      (_, i) => i + 1
    );
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.loadProducts();
  }

  nextPage() {
    if (this.currentPage < this.totalPages.length) {
      this.currentPage++;
      this.loadProducts();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadProducts();
    }
  }
}
