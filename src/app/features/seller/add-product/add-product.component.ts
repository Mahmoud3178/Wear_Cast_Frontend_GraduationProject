import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-add-product',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-product.component.html',
  styleUrl: './add-product.component.css'
})
export class AddProductComponent implements OnInit {
  router: any;

  constructor(private productService: ProductService) {}

  currentStep = 1;

  // 🔹 Step 1
  name = '';
  description = '';
  price: number = 0;
  targetAudience: any;
  categoryId: any;
  dressStyle: any;

  categories: any[] = [];
successMessage = '';
isSaving = false;
  // 🔹 Step 2
  colorName = '';
  colorCode = '#000000';
  mainImage: any;
  additionalImages: any[] = [];
  productId: any;

  sizes = [
    { name: '2XS', a: 0, b: 0, c: 0, quantity: 0 },
    { name: 'XS', a: 0, b: 0, c: 0, quantity: 0 },
    { name: 'S', a: 0, b: 0, c: 0, quantity: 0 },
    { name: 'M', a: 0, b: 0, c: 0, quantity: 0 },
    { name: 'L', a: 0, b: 0, c: 0, quantity: 0 },
    { name: 'XL', a: 0, b: 0, c: 0, quantity: 0 },
    { name: '2XL', a: 0, b: 0, c: 0, quantity: 0 }
  ];

  // 🔹 Size Mapping to match backend enum
  sizeMapping: Record<string, number> = {
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
  }

  loadCategories() {
    this.productService.getCategories().subscribe(res => {
      this.categories = res;
    });
  }

  createProduct() {
  const sizeDetails = this.sizes.map(s => ({
    size: this.sizeMapping[s.name],
    a: s.a || 0.1,
    b: s.b || 0.1,
    c: s.c || 0.1
  }));

  const body = {
    name: this.name,
    description: this.description,
    price: +this.price,
    categoryId: +this.categoryId,
    dressStyle: +this.dressStyle,
    targetAudience: +this.targetAudience,
    sizeDetails: sizeDetails
  };

  this.productService.create(body).subscribe({
    next: (res: any) => {
      this.productId = res.id; // 🔹 رقم المنتج فقط
      this.currentStep = 2;
    },
    error: err => console.error('Error creating product', err)
  });
}

saveProduct() {
  if (!this.productId) return;

  this.isSaving = true; // لو عايز تعمل loading indicator

  const sizesArray = this.sizes.map(s => ({
    size: this.sizeMapping[s.name],
    quantity: s.quantity > 0 ? s.quantity : 1,
    a: s.a,
    b: s.b,
    c: s.c
  }));

  const formData = new FormData();
  formData.append('ProductId', this.productId.toString());
  formData.append('ColorName', this.colorName);
  formData.append('ColorCode', this.colorCode);
  formData.append('Sizes', JSON.stringify(sizesArray));

  if (this.mainImage) formData.append('Image', this.mainImage);
  this.additionalImages.forEach(file => formData.append('AdditionalImages', file));

  this.productService.createProductColor(formData).subscribe({
    next: res => {
      this.isSaving = false;
      this.successMessage = 'Product added successfully! 🎉';

      // بعد 2 ثانية يحولك لصفحة المنتجات
      setTimeout(() => {
        this.router.navigate(['/products']); // عدل حسب route بتاعك
      }, 2000);
    },
    error: err => {
      this.isSaving = false;
      console.error('Error saving product', err);
    }
  });
}

  // 🔹 Image handlers
  onMainImage(event: any) { this.mainImage = event.target.files[0]; }
  onAdditionalImages(event: any) { this.additionalImages = Array.from(event.target.files); }

  // 🔹 Navigation
  prevStep() { this.currentStep = 1; }
  nextStep() { this.currentStep = 2; }

}
