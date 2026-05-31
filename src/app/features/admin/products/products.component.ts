import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class ProductsComponent implements OnInit {

  products: any[] = [];
  searchTerm = '';
  currentPage = 1;
  pageSize = 5;
  totalCount = 0;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts() {
    this.adminService
      .getAllProducts(this.currentPage, this.pageSize, this.searchTerm)
      .subscribe({
        next: (res: any) => {
          this.products = res.items || res.data || [];
this.totalCount = res.records;
        },
        error: (err) => {
          console.error('Error loading products', err);
        }
      });
  }

  // 🔹 search من السيرفر
  applyFilter() {
    this.currentPage = 1;
    this.loadProducts();
  }

  // 🔹 pagination
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
