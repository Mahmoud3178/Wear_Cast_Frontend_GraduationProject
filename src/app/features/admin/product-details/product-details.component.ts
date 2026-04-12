import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.css'
})
export class ProductDetailsComponent {

  productId: any;
  product: any;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.productId = this.route.snapshot.paramMap.get('id');
    this.loadProduct();
  }

  loadProduct() {
    // مؤقت (بعد كدا تربطه API)
    this.product = {
      id: this.productId,
      name: 'Vintage Cotton T-Shirt',
      price: 35,
      description: 'Crafted from premium cotton...',
      image: 'https://via.placeholder.com/300',
      store: 'Urban Threads',
      stock: 1240,
      profit: 65,
      variants: [
        { size: 'S', color: 'Beige', stock: 120 },
        { size: 'M', color: 'Beige', stock: 80 },
        { size: 'L', color: 'Black', stock: 50 }
      ]
    };
  }

  reviews = [
  {
    name: 'John Doe',
    date: 'Oct 26, 2023',
    comment: 'Very good quality, highly recommended!'
  },
  {
    name: 'Sarah',
    date: 'Oct 25, 2023',
    comment: 'Nice product but size runs small.'
  }
];
  showReviews = false;

toggleReviews() {
  this.showReviews = !this.showReviews;
}
}
