import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.css'
})
export class ProductDetailsComponent implements OnInit {

  productId!: number;
  product: any;
  loading = true;

  selectedColor: any;
  currentImage: string = '';

  currentIndex = 0;

  constructor(
    private route: ActivatedRoute,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    this.productId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadProduct();
  }

  loadProduct(colorId?: number) {
    this.loading = true;

    this.adminService.getProductById(this.productId, colorId).subscribe({
      next: (res: any) => {

        this.product = res;

        this.selectedColor = this.product?.colors?.[0];

        this.setDefaultImage();

        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading product', err);
        this.loading = false;
      }
    });
  }

  // 🔹 كل الصور
  get allImages(): string[] {
    if (!this.selectedColor) return [];

    const main = this.selectedColor.imageUrl;
    const gallery = this.selectedColor.images?.map((x: any) => x.imageUrl) || [];

    return [main, ...gallery];
  }

  setDefaultImage() {
    this.currentIndex = 0;
    this.currentImage = this.allImages[0];
  }

  setImageByIndex(index: number) {
    this.currentIndex = index;
    this.currentImage = this.allImages[index];
  }

  nextImage() {
    if (!this.allImages.length) return;

    this.currentIndex = (this.currentIndex + 1) % this.allImages.length;
    this.currentImage = this.allImages[this.currentIndex];
  }

  prevImage() {
    if (!this.allImages.length) return;

    this.currentIndex =
      (this.currentIndex - 1 + this.allImages.length) % this.allImages.length;

    this.currentImage = this.allImages[this.currentIndex];
  }

  changeColor(color: any) {
    this.selectedColor = color;
    this.setDefaultImage();
  }

  getImage(img: string) {
    return img?.trim()
      ? img
      : 'https://via.placeholder.com/300';
  }
}
