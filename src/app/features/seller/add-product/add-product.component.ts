import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-add-product',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-product.component.html',
  styleUrl: './add-product.component.css'
})
export class AddProductComponent implements OnInit {

  constructor(
    private productService: ProductService,
    private router: Router
  ) {}

  currentStep = 1;

  // STEP 1
  name = '';
  description = '';
  price = 0;
  targetAudience: number = 1;
  categoryId: any;
  dressStyle: any;

  categories: any[] = [];

  // STEP 2
  productId: any;
  isSaving = false;
  successMessage = '';

  colors: any[] = [];

  sizes = [
    { name: '2XS', a: 0, b: 0, c: 0 },
    { name: 'XS', a: 0, b: 0, c: 0 },
    { name: 'S', a: 0, b: 0, c: 0 },
    { name: 'M', a: 0, b: 0, c: 0 },
    { name: 'L', a: 0, b: 0, c: 0 },
    { name: 'XL', a: 0, b: 0, c: 0 },
    { name: '2XL', a: 0, b: 0, c: 0 }
  ];

  sizeMapping: any = {
    '2XS': 11,
    'XS': 12,
    'S': 13,
    'M': 14,
    'L': 15,
    'XL': 16,
    '2XL': 17
  };

  ngOnInit() {
    this.loadCategories();
    this.addColor(); // default color
  }

  loadCategories() {
    this.productService.getCategories().subscribe(res => {
      this.categories = res;
    });
  }

  // STEP 1
  createProduct() {

    const body = {
      name: this.name,
      description: this.description,
      price: this.price,
      categoryId: this.categoryId,
      dressStyle: this.dressStyle,
      targetAudience: this.targetAudience,
      sizeDetails: this.sizes.map(s => ({
        size: this.sizeMapping[s.name],
        a: s.a,
        b: s.b,
        c: s.c
      }))
    };

    this.productService.create(body).subscribe((res: any) => {
      this.productId = res.id;
      this.currentStep = 2;
    });
  }

  // COLORS
  addColor() {
    this.colors.push({
      colorName: '',
      colorCode: '#000000',
      mainImage: null,
      additionalImages: [],
      sizes: JSON.parse(JSON.stringify(this.sizes))
    });
  }

  removeColor(i: number) {
    this.colors.splice(i, 1);
  }

  onMainImage(event: any, i: number) {
    this.colors[i].mainImage = event.target.files[0];
  }

  onAdditionalImages(event: any, i: number) {
    this.colors[i].additionalImages = Array.from(event.target.files);
  }

  // SAVE
  saveProduct() {

    this.isSaving = true;

    const requests = this.colors.map(c => {

      const formData = new FormData();

      formData.append('ProductId', this.productId);
      formData.append('ColorName', c.colorName);
      formData.append('ColorCode', c.colorCode);

      if (c.mainImage)
        formData.append('Image', c.mainImage);

      c.additionalImages.forEach((f: any) =>
        formData.append('AdditionalImages', f)
      );

      formData.append('Sizes', JSON.stringify(
        c.sizes.map((s: any) => ({
          size: this.sizeMapping[s.name],
          a: s.a,
          b: s.b,
          c: s.c
        }))
      ));

      return this.productService.createProductColor(formData);
    });

    Promise.all(requests.map(r => r.toPromise()))
      .then(() => {
        this.isSaving = false;
        this.successMessage = 'Product added successfully';

        setTimeout(() => {
          this.router.navigate(['/products']);
        }, 1500);
      });
  }
}
