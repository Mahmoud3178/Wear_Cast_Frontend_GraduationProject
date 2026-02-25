import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CustomerNavComponent } from '../shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../shared/customer-footer/customer-footer.component';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, RouterLink, CustomerNavComponent, CustomerFooterComponent],
  templateUrl: './category.component.html',
  styleUrl: './category.component.css'
})
export class CategoryComponent {
  categories = ['All', 'T-shirt', 'Hoodie', 'Jeans'];
  sizes = ['XS', 'S', 'M', 'L', 'XL'];
  selectedCategory = 'All';
  selectedSize = 'M';
  maxPrice = 300;

  products = [
    { name: 'Gradient Graphic T‑shirt', category: 'T-shirt', price: 145, rating: 4.5 },
    { name: 'Vertical Striped Shirt', category: 'T-shirt', price: 212, rating: 5.0 },
    { name: 'Courage Graphic T‑shirt', category: 'T-shirt', price: 145, rating: 4.0 },
    { name: 'Loose Fit Bermuda Shorts', category: 'Jeans', price: 80, rating: 3.9 },
    { name: 'Cozy Hoodie', category: 'Hoodie', price: 190, rating: 4.7 },
    { name: 'Classic Hoodie', category: 'Hoodie', price: 160, rating: 4.3 },
    { name: 'Skinny Fit Jeans', category: 'Jeans', price: 240, rating: 4.8 },
    { name: 'Relaxed Jeans', category: 'Jeans', price: 180, rating: 4.1 }
  ];

  get filteredProducts() {
    return this.products.filter(p => {
      const matchCategory = this.selectedCategory === 'All' || p.category === this.selectedCategory;
      const matchPrice = p.price <= this.maxPrice;
      // Size is not tied to mock data; treat as always available but still part of filter UI
      return matchCategory && matchPrice;
    });
  }

  setCategory(cat: string) {
    this.selectedCategory = cat;
  }

  setSize(size: string) {
    this.selectedSize = size;
  }

  onPriceChange(value: string) {
    this.maxPrice = Number(value) || this.maxPrice;
  }
}

