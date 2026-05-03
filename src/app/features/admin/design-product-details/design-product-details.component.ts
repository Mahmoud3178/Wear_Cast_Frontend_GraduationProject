import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminDesignProductsService } from '../../../core/services/admin-design-products.service';

@Component({
  selector: 'app-design-product-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './design-product-details.component.html',
  styleUrl: './design-product-details.component.css'
})
export class DesignProductDetailsComponent implements OnInit {

  product: any;
  loading = true;

  selectedColor: any;
  currentImage: string = '';

  reviews: any[] = [];

  newReview = {
    rating: 0,
    comment: ''
  };

  Math = Math;

  constructor(
    private route: ActivatedRoute,
    private service: AdminDesignProductsService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadProduct(id);
    this.loadReviews(id);
  }

  loadProduct(id: number, colorId?: number) {
    this.loading = true;

    this.service.getDesignedProductById(id, colorId).subscribe({
      next: (res: any) => {
        this.product = res?.data;
        this.selectedColor = this.product?.colors?.[0];
        this.setDefaultImage();
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  // ================= REVIEWS =================
  loadReviews(id: number) {
    this.service.getReviews(id).subscribe((res: any) => {
      this.reviews = res?.items || [];
    });
  }

  addReview() {
    const id = this.product.id;

    this.service.addReview(id, this.newReview).subscribe(() => {
      this.newReview = { rating: 0, comment: '' };
      this.loadReviews(id);
    });
  }

  deleteReview(id: number) {
    this.service.deleteReview(id).subscribe(() => {
      this.reviews = this.reviews.filter(r => r.id !== id);
    });
  }

  // ================= UI =================
  setDefaultImage() {
    this.currentImage =
      this.selectedColor?.images?.[0]?.imageUrl ||
      this.selectedColor?.mainImageUrl;
  }

  changeColor(color: any) {
    this.selectedColor = color;
    this.setDefaultImage();
  }

  changeImage(img: string) {
    this.currentImage = img;
  }

  getImage(img: string) {
    return img?.trim()
      ? img
      : 'https://via.placeholder.com/300';
  }

  setRating(r: number) {
    this.newReview.rating = r;
  }
}
