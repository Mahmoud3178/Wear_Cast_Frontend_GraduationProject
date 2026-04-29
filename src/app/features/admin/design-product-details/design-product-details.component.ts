import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AdminDesignProductsService } from '../../../core/services/admin-design-products.service';

@Component({
  selector: 'app-design-product-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './design-product-details.component.html',
  styleUrl: './design-product-details.component.css'
})
export class DesignProductDetailsComponent implements OnInit {

  product: any;
  loading = true;

  selectedColor: any;
  currentImage: string = '';

  Math = Math;

  constructor(
    private route: ActivatedRoute,
    private service: AdminDesignProductsService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadProduct(id);
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
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  setDefaultImage() {
    if (this.selectedColor?.images?.length) {
      this.currentImage = this.selectedColor.images[0].imageUrl;
    } else {
      this.currentImage = this.selectedColor?.mainImageUrl;
    }
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
}
