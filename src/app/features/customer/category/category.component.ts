import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CustomerNavComponent } from '../shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../shared/customer-footer/customer-footer.component';
import { FactoryApiService } from '../../../core/services/factory-api.service';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CustomerNavComponent, CustomerFooterComponent],
  templateUrl: './category.component.html',
  styleUrl: './category.component.css'
})
export class CategoryComponent implements OnInit {
  factoryApiService = inject(FactoryApiService);

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
    { label: 'Price (High to Low)', value: 3 }
  ];

  selectedAudience: number | null = null;
  selectedStyle: number | null = null;
  selectedSort: number | null = 0;
  minPrice = 0;
  maxPrice = 500;
  
  products: any[] = [];
  loading = false;
  error = '';

  ngOnInit(): void {
    this.fetchProducts();
  }

  fetchProducts(): void {
    this.loading = true;
    this.error = '';
    
    let params: any = {
      PageIndex: 1,
      PageSize: 50,
      MinPrice: this.minPrice,
      MaxPrice: this.maxPrice
    };
    
    if (this.selectedAudience !== null) params.TargetAudience = this.selectedAudience;
    if (this.selectedStyle !== null) params.DressStyle = this.selectedStyle;
    if (this.selectedSort !== null) params.SortBy = this.selectedSort;
    
    this.factoryApiService.getAllFixedProducts(params).subscribe({
      next: (res: any) => {
        this.loading = false;
        // Handle varying possible responses: might be wrapped in data/items/etc
        this.products = res?.items ?? res?.data ?? res ?? [];
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Failed to load products';
        console.error(err);
      }
    });
  }

  }


