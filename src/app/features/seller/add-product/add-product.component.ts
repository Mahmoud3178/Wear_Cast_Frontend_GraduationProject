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

  constructor(
    private productService: ProductService,
    private router: Router
  ) {}

  currentStep = 1;

  // ── STEP 1 fields ──────────────────────────────────────
  name        = '';
  description = '';
  price       = 0;
  targetAudience: number = 1;
  categoryId:  any = null;
  dressStyle:  any = null;

  categories: any[] = [];

  // Step 1 validation
  validationErrors: { [key: string]: string } = {};
  isCreating = false;

  // ── STEP 2 ─────────────────────────────────────────────
  productId: any;
  isSaving      = false;
  successMessage = '';
  saveErrors: string[] = [];   // ← errors shown in UI instead of alert

  colors: any[] = [];

  // سايز names فقط — القيم بتتحدد per color في Step 2
  readonly sizeNames = ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL'];

  readonly sizeMapping: Record<string, number> = {
    '2XS': 11, 'XS': 12, 'S': 13, 'M': 14, 'L': 15, 'XL': 16, '2XL': 17
  };

  // ── Init ───────────────────────────────────────────────
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

  selectCategory(id: number) {
    this.categoryId = id;
    delete this.validationErrors['CategoryId'];
  }

  // ── Step 1 — create the product shell ─────────────────
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
      // الـ sizeDetails بيتبعت فاضي — القيم بتتحدد لكل color في Step 2
      sizeDetails: this.sizeNames.map(n => ({
        size: this.sizeMapping[n], a: 0, b: 0, c: 0
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
        const body = err?.error;
        if (body?.validationErrors) {
          this.validationErrors = body.validationErrors;
        } else if (body?.errors) {
          this.validationErrors = Object.fromEntries(
            Object.entries(body.errors).map(([k, v]) => [k, (v as string[])[0]])
          );
        } else {
          this.validationErrors = {
            '_general': body?.message || 'Failed to create product.'
          };
        }
      }
    });
  }

  // ── Colors helpers ────────────────────────────────────
  addColor() {
    this.colors.push({
      colorName:        '',
      colorCode:        '#000000',
      mainImage:        null,
      additionalImages: [],
      // كل color عندها sizes خاصة بيها
      sizes: this.sizeNames.map(n => ({ name: n, a: 0, b: 0, c: 0 }))
    });
  }

  removeColor(i: number) { this.colors.splice(i, 1); }

  onMainImage(event: any, i: number) {
    this.colors[i].mainImage = event.target.files[0];
  }

  onAdditionalImages(event: any, i: number) {
    this.colors[i].additionalImages = Array.from(event.target.files);
  }

  // ── Step 2 — save colors ──────────────────────────────
  saveProduct() {
    this.isSaving    = true;
    this.saveErrors  = [];
    this.successMessage = '';

    const requests = this.colors.map(c => {
      const fd = new FormData();
      fd.append('ProductId',  String(this.productId));
      fd.append('ColorName',  c.colorName);
      fd.append('ColorCode',  c.colorCode);

      if (c.mainImage) fd.append('Image', c.mainImage);
      (c.additionalImages as File[]).forEach(f => fd.append('AdditionalImages', f));

      // بعت الـ sizes اللي فيها قيمة > 0 بس
      const validSizes = c.sizes.filter(
        (s: any) => Number(s.a) > 0 || Number(s.b) > 0 || Number(s.c) > 0
      );
      fd.append('Sizes', JSON.stringify(
        validSizes.map((s: any) => ({
          size:     this.sizeMapping[s.name],
          quantity: Number(s.a) + Number(s.b) + Number(s.c),
          a: Number(s.a),
          b: Number(s.b),
          c: Number(s.c)
        }))
      ));

      return this.productService.createProductColor(fd);
    });

    // forkJoin بدل Promise.all — بيرجع Observable وبيـ handle error صح
    forkJoin(requests).subscribe({
      next: () => {
        this.isSaving       = false;
        this.successMessage = 'Product saved successfully ✅';
        setTimeout(() => this.router.navigate(['/seller/products']), 1500);
      },
      error: (err: any) => {
        this.isSaving = false;
        const body = err?.error;

        // اجمع كل errors في array وعرضها في الـ UI
        if (body?.validationErrors) {
          this.saveErrors = Object.values(body.validationErrors) as string[];
        } else if (body?.errors) {
          this.saveErrors = Object.values(body.errors).flat() as string[];
        } else if (body?.message) {
          this.saveErrors = [body.message];
        } else {
          this.saveErrors = ['Failed to save product. Please check your inputs.'];
        }
      }
    });
  }

  get validationErrorKeys() {
    return Object.keys(this.validationErrors);
  }
}
