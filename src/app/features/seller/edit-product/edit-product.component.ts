import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ProductService } from '../../../core/services/product.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-edit-product',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-product.component.html',
  styleUrls: ['./edit-product.component.css']
})
export class EditProductComponent implements OnInit {

  productId!: number;
  productForm!: FormGroup;

  mainImageFile?: File;
  additionalFiles: File[] = [];

  mainImagePreview: string | ArrayBuffer | null = null;
  additionalImagesPreview: (string | ArrayBuffer | null)[] = [];

  categories: any[] = [];

  constructor(
    private productService: ProductService,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {

    this.productId = Number(this.route.snapshot.paramMap.get('id'));

    // ✅ الفورم
    this.productForm = this.fb.group({
      id: [0],
      categoryId: [0, Validators.required],
      name: ['', Validators.required],
      price: [0, Validators.required],
      description: [''],
      dressStyle: [0],
      targetAudience: [0],
      sizeDetails: this.fb.array([])
    });

    // ✅ categories
    this.productService.getCategories().subscribe(res => {
      this.categories = res.items || [];
    });

    // ✅ load product
    this.productService.getById(this.productId).subscribe((res: any) => {

      this.productForm.patchValue({
        id: res.id,
        categoryId: res.categoryId,
        name: res.name,
        price: res.price,
        description: res.description,
        targetAudience: res.targetAudience,
        dressStyle: res.dressStyle
      });

      this.setSizes(res.sizeDetails || []);
      this.mainImagePreview = res.mainImageUrl;
    });
  }

  // =========================
  // 🔹 Sizes
  // =========================
  get sizeDetails(): FormArray {
    return this.productForm.get('sizeDetails') as FormArray;
  }

  setSizes(sizes: any[]) {
    this.sizeDetails.clear();
    sizes.forEach(s => {
      this.sizeDetails.push(
        this.fb.group({
          size: [s.size, Validators.required],
          a: [s.a, Validators.required],
          b: [s.b, Validators.required],
          c: [s.c, Validators.required]
        })
      );
    });
  }

  addSize() {
    this.sizeDetails.push(
      this.fb.group({
        size: [''],
        a: [0],
        b: [0],
        c: [0]
      })
    );
  }

  removeSize(index: number) {
    this.sizeDetails.removeAt(index);
  }

  // =========================
  // 🔹 Images
  // =========================
  onMainImageChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.mainImageFile = file;

      const reader = new FileReader();
      reader.onload = e => this.mainImagePreview = e.target?.result ?? null;
      reader.readAsDataURL(file);
    }
  }

  onAdditionalImagesChange(event: any) {
    const files = event.target.files;
    if (files) {
      this.additionalFiles = Array.from(files);
      this.additionalImagesPreview = [];

      this.additionalFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = e => this.additionalImagesPreview.push(e.target?.result ?? null);
        reader.readAsDataURL(file);
      });
    }
  }

  // =========================
  // 🔹 Submit
  // =========================
 saveChanges() {

  const productData = {
    ...this.productForm.value
  };

  this.productService.update(productData).subscribe({
    next: () => {
      alert('Updated Successfully ✅');
      this.router.navigate(['/seller/products']);
    },
    error: err => {
      console.error(err);
      alert('Error ❌');
    }
  });

}
}
