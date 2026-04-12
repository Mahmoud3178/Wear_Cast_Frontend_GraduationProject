import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule,RouterLink],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class ProductsComponent {

  products: any[] = [];
  filteredProducts: any[] = [];

  searchTerm = '';
  currentPage = 1;
  pageSize = 5;

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts() {
    this.products = [
      {
        id: 1,
        name: 'Classic Denim Jacket',
        store: 'Denim Dreams',
        price: 79.99,
        image: 'https://via.placeholder.com/40'
      },
      {
        id: 2,
        name: 'White Sneakers',
        store: 'Urban Style',
        price: 59.99,
        image: 'https://via.placeholder.com/40'
      },
      {
        id: 3,
        name: 'Leather Bag',
        store: 'Luxury Bags',
        price: 120,
        image: 'https://via.placeholder.com/40'
      },
      {
        id: 4,
        name: 'Black Hoodie',
        store: 'Street Wear',
        price: 45,
        image: 'https://via.placeholder.com/40'
      }
    ];

    this.applyFilter();
  }

  applyFilter() {
    this.filteredProducts = this.products.filter(p =>
      p.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      p.store.toLowerCase().includes(this.searchTerm.toLowerCase())
    );

    this.currentPage = 1;
  }

  // pagination
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

  get pagedProducts() {
    return this.filteredProducts.slice(this.startIndex, this.endIndex);
  }

  goToPage(page: number) {
    this.currentPage = page;
  }

  nextPage() {
    if (this.currentPage < this.totalPages.length) this.currentPage++;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }
}
