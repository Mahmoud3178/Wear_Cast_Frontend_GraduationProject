import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-add-product',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-product.component.html',
  styleUrl: './add-product.component.css'
})
export class AddProductComponent implements OnInit {

  constructor(private productService: ProductService, private router: Router) {}

  currentStep = 1;

  // ── STEP 1 ──────────────────────────────────────────
  name           = '';
  description    = '';
  price          = 0;
  targetAudience = 1;
  categoryId: any = null;
  dressStyle: any = null;
  categories: any[] = [];
  validationErrors: { [key: string]: string } = {};
  isCreating = false;

  // Category preview modal
  previewCat: any = null;

  // Global sizes table (Step 1) — A/B/C measurements
  readonly sizeNames = ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL'];
  readonly sizeMapping: Record<string, number> = {
    '2XS': 11, 'XS': 12, 'S': 13, 'M': 14, 'L': 15, 'XL': 16, '2XL': 17
  };

  globalSizes: { name: string; a: number; b: number; c: number }[] =
    this.sizeNames.map(n => ({ name: n, a: 0, b: 0, c: 0 }));

  // ✅ FIX: getter replaces .find() in the template
  get selectedCategoryName(): string {
    return this.categories.find(c => c.id === this.categoryId)?.name ?? '';
  }

  // ── STEP 2 ──────────────────────────────────────────
  productId: any;
  isSaving = false;
  successMessage = '';
  saveErrors: string[] = [];
  colors: any[] = [];

  ngOnInit() {
    this.loadCategories();
    this.addColor();
  }

  loadCategories() {
    this.productService.getCategories().subscribe({
      next: (res: any) => {
        this.categories = Array.isArray(res) ? res : (res?.data ?? res?.items ?? []);
      },
      error: () => { this.categories = []; }
    });
  }

  openCatPreview(cat: any) {
    this.previewCat = cat;
  }

  confirmCatSelect() {
    if (this.previewCat) {
      this.categoryId = this.previewCat.id;
      delete this.validationErrors['CategoryId'];
      this.previewCat = null;
    }
  }

  selectCategory(cat: any) {
    if (this.categoryId === cat.id) {
      this.categoryId = null;
    } else {
      this.openCatPreview(cat);
    }
  }

  // ── Step 1 submit ──────────────────────────────────
  createProduct() {
    this.validationErrors = {};
    this.isCreating = true;

    const body = {
      name:           this.name,
      description:    this.description,
      price:          this.price,
      categoryId:     this.categoryId ? Number(this.categoryId) : null,
      dressStyle:     this.dressStyle  ? Number(this.dressStyle)  : null,
      targetAudience: this.targetAudience,
      sizeDetails: this.globalSizes.map(s => ({
        size: this.sizeMapping[s.name],
        a: Number(s.a),
        b: Number(s.b),
        c: Number(s.c)
      }))
    };

    this.productService.create(body).subscribe({
      next: (res: any) => {
        this.isCreating  = false;
        this.productId   = res?.id ?? res?.data?.id;
        this.currentStep = 2;
      },
      error: (err: any) => {
        this.isCreating = false;
        const b = err?.error;
        if (b?.validationErrors) {
          this.validationErrors = b.validationErrors;
        } else if (b?.errors) {
          this.validationErrors = Object.fromEntries(
            Object.entries(b.errors).map(([k, v]) => [k, (v as string[])[0]])
          );
        } else {
          this.validationErrors = { '_general': b?.message || 'Failed to create product.' };
        }
      }
    });
  }

  // ── Colors ─────────────────────────────────────────
  addColor() {
    this.colors.push({
      colorName:        '',
      colorCode:        '#000000',
      mainImage:        null,
      additionalImages: [],
      quantities: this.sizeNames.map(n => ({ name: n, quantity: 0 }))
    });
  }

  removeColor(i: number) { this.colors.splice(i, 1); }

  onMainImage(event: any, i: number) {
    this.colors[i].mainImage = event.target.files[0];
  }

  onAdditionalImages(event: any, i: number) {
    this.colors[i].additionalImages = Array.from(event.target.files);
  }

  // ── Step 2 save ────────────────────────────────────
  saveProduct() {
    this.isSaving       = true;
    this.saveErrors     = [];
    this.successMessage = '';

    const requests = this.colors.map(c => {
      const fd = new FormData();
      fd.append('ProductId', String(this.productId));
      fd.append('ColorName', c.colorName);
      fd.append('ColorCode', c.colorCode);
      if (c.mainImage) fd.append('Image', c.mainImage);
      (c.additionalImages as File[]).forEach(f => fd.append('AdditionalImages', f));

      const validSizes = c.quantities
        .filter((q: any) => Number(q.quantity) > 0)
        .map((q: any) => {
          const meas = this.globalSizes.find(s => s.name === q.name)!;
          return {
            size:     this.sizeMapping[q.name],
            quantity: Number(q.quantity),
            a:        Number(meas?.a ?? 0),
            b:        Number(meas?.b ?? 0),
            c:        Number(meas?.c ?? 0)
          };
        });

      fd.append('Sizes', JSON.stringify(validSizes));
      return this.productService.createProductColor(fd);
    });

    forkJoin(requests).subscribe({
      next: () => {
        this.isSaving       = false;
        this.successMessage = 'Product saved successfully ✅';
        setTimeout(() => this.router.navigate(['/seller/products']), 1500);
      },
      error: (err: any) => {
        this.isSaving = false;
        const b = err?.error;
        if (b?.validationErrors)  this.saveErrors = Object.values(b.validationErrors) as string[];
        else if (b?.errors)       this.saveErrors = (Object.values(b.errors) as string[][]).flat();
        else if (b?.message)      this.saveErrors = [b.message];
        else                      this.saveErrors = ['Failed to save product. Please check your inputs.'];
      }
    });
  }

  get validationErrorKeys() { return Object.keys(this.validationErrors); }
}
