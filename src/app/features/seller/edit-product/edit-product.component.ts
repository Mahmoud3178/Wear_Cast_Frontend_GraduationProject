import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-edit-product',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-product.component.html',
  styleUrls: ['./edit-product.component.css']
})
export class EditProductComponent implements OnInit {

  productId!: number;
  isLoading = false;
  isSaving  = false;
  saveMsg   = '';
  saveError = '';

  product: any = {
    id: 0, name: '', price: 0, description: '',
    targetAudience: 1, categoryId: 0, dressStyle: 1
  };

  categories:  any[] = [];
  sizeDetails: any[] = [];
  colors:      any[] = [];
private allSizes = ['_2XS','_XS','_S','_M','_L','_XL','_2XL','_3XL','_4XL','_5XL'];
readonly sizeLabels: Record<string, string> = {
  '_2XS':'2XS',
  '_XS':'XS',
  '_S':'S',
  '_M':'M',
  '_L':'L',
  '_XL':'XL',
  '_2XL':'2XL',
  '_3XL':'3XL',
  '_4XL':'4XL',
  '_5XL':'5XL'
};
readonly sizeMapping: Record<string, number> = {
  '_2XS':11,
  '_XS':12,
  '_S':13,
  '_M':14,
  '_L':15,
  '_XL':16,
  '_2XL':17,
  '_3XL':18,
  '_4XL':19,
  '_5XL':20
};

  // ── Add-color form ──────────────────────────────────
  newColor: {
    colorName:        string;
    colorCode:        string;
    mainImage:        File | null;
    additionalImages: File[];   // ✅ supports many files
  } = { colorName: '', colorCode: '#000000', mainImage: null, additionalImages: [] };

newColorSizes: { name: string; quantity: number }[] =
  ['_2XS','_XS','_S','_M','_L','_XL','_2XL','_3XL','_4XL','_5XL']
    .map(n => ({ name: n, quantity: 0 }));

  isAddingColor = false;

  // ── UI state ────────────────────────────────────────
  expandedColorId: number | null = null;
  colorSaving: Record<number, boolean> = {};
  colorMsg:    Record<number, string>  = {};

  // ── Adjust quantities ────────────────────────────────
  adjustingColor: any = null;
  adjustSizes: { size: string; currentQty: number; newQty: number }[] = [];

  constructor(
    private productService: ProductService,
    private route: ActivatedRoute,
    public  router: Router,
      private toast: ToastService  // أضف هنا

  ) {}

  ngOnInit(): void {
    this.productId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadCategories();
    this.loadProduct();
  }

  // ── Load ─────────────────────────────────────────────
  loadCategories() {
    this.productService.getCategories().subscribe({
      next: (res: any) => {
        this.categories = Array.isArray(res) ? res : (res?.items ?? res?.data ?? []);
      }
    });
  }

  loadProduct() {
    this.isLoading = true;
    this.productService.getDetails(this.productId).subscribe({
      next: (res: any) => {
        this.product = {
          id:             res.id,
          name:           res.name,
          price:          res.price,
          description:    res.description,
targetAudience: res.targetAudience === 'Men' ? 1
              : res.targetAudience === 'Women' ? 2
              : res.targetAudience === 'Unisex' ? 3
              : res.targetAudience === 'Kids' ? 4
              : res.targetAudience === 'Babies' ? 8
              : Number(res.targetAudience) || 1,
                        categoryId:     res.category?.id ?? 0,
          dressStyle:     res.dressStyle ?? 1
        };
this.sizeDetails = this.allSizes.map(sz => {
  const found = (res.sizeDetails ?? []).find((s: any) => s.size === sz);

  return {
    size: sz,
    a: found?.a ?? 0,
    b: found?.b ?? 0,
    c: found?.c ?? 0
  };
});        this.colors = (res.colors ?? []).map((c: any) => ({
          ...c,
          editName:       c.colorName,
          editCode:       c.colorCode,
          newMainFile:    null as File | null,
          newMainPreview: c.imageUrl,
          addImageFiles:  [] as File[]
        }));
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  // ── Save product ──────────────────────────────────────
  saveProduct() {
    this.isSaving  = true;
    this.saveMsg   = '';
    this.saveError = '';

    const body = {
      id:             this.product.id,
      categoryId:     Number(this.product.categoryId),
      name:           this.product.name,
      price:          Number(this.product.price),
      description:    this.product.description,
      dressStyle:     Number(this.product.dressStyle),
      targetAudience: Number(this.product.targetAudience),
      sizeDetails:    this.sizeDetails.map(s => ({
        size: this.sizeMapping[s.size] ?? s.size,
        a: Number(s.a), b: Number(s.b), c: Number(s.c)
      }))
    };

    this.productService.update(body).subscribe({
      next: () => {
        this.isSaving = false;
        this.saveMsg  = 'Product updated successfully ✅';
        setTimeout(() => this.saveMsg = '', 3000);
      },
error: (err: any) => {
  this.isSaving = false;
  const errBody = err?.error;

  if (errBody?.validationErrors) {
    this.saveError = Object.entries(errBody.validationErrors)
      .map(([field, msg]) => `${field}: ${msg}`)
      .join(' | ');
  } else {
    this.saveError = errBody?.description || errBody?.message || errBody?.title || 'Update failed ❌';
  }
  this.toast.error(this.saveError); // أضف هنا
}
    });
  }

  // ── Color actions ─────────────────────────────────────
  toggleColor(id: number) {
    this.expandedColorId = this.expandedColorId === id ? null : id;
  }

  onColorMainImage(event: any, color: any) {
    color.newMainFile = event.target.files[0];
    const r = new FileReader();
    r.onload = e => color.newMainPreview = e.target?.result;
    r.readAsDataURL(color.newMainFile);
  }

  saveColor(color: any) {
    this.colorSaving[color.id] = true;
    this.colorMsg[color.id]    = '';

    const fd = new FormData();
    fd.append('ColorId',   String(color.id));
    fd.append('ColorName', color.editName);
    fd.append('ColorCode', color.editCode);
    if (color.newMainFile) fd.append('Image', color.newMainFile);

    this.productService.updateColor(fd).subscribe({
      next: () => {
        this.colorSaving[color.id] = false;
        this.colorMsg[color.id]    = '✅ Saved';
        color.colorName = color.editName;
        color.colorCode = color.editCode;
        setTimeout(() => this.colorMsg[color.id] = '', 2500);
      },
error: (err: any) => {
  this.colorSaving[color.id] = false;
  const errBody = err?.error;

  if (errBody?.validationErrors) {
    this.colorMsg[color.id] = '❌ ' + Object.entries(errBody.validationErrors)
      .map(([field, msg]) => `${field}: ${msg}`)
      .join(' | ');
  } else {
    this.colorMsg[color.id] = '❌ ' + (errBody?.description || errBody?.message || 'Failed');
  }
  this.toast.error(this.colorMsg[color.id].replace('❌ ', '')); // أضف هنا
}
    });
  }

  deleteColor(color: any) {
    if (!confirm(`Delete color "${color.colorName}"? This cannot be undone.`)) return;
    this.productService.deleteColor(color.id).subscribe({
      next: () => { this.colors = this.colors.filter(c => c.id !== color.id); },
error: (err: any) => {
  this.toast.error('Delete failed: ' + (err?.error?.message || '')); // بدل alert
}
  });
  }

  // ── Gallery images ────────────────────────────────────
  onAddImages(event: any, color: any) {
    color.addImageFiles = Array.from(event.target.files as FileList);
  }

  uploadAdditionalImages(color: any) {
    if (!color.addImageFiles?.length) return;
    this.colorSaving[color.id] = true;

    const uploads = (color.addImageFiles as File[]).map((f: File) => {
      const fd = new FormData();
      fd.append('ProductColorId', String(color.id));
      fd.append('Image', f);
      return this.productService.addImage(fd).toPromise();
    });

    Promise.all(uploads)
      .then(() => {
        this.colorSaving[color.id] = false;
        this.colorMsg[color.id]    = '✅ Images uploaded';
        color.addImageFiles = [];
        this.loadProduct();
        setTimeout(() => this.colorMsg[color.id] = '', 2500);
      })
      .catch(() => {
        this.colorSaving[color.id] = false;
        this.colorMsg[color.id]    = '❌ Upload failed';
      });
  }

  deleteImage(imageId: number, color: any) {
    if (!confirm('Delete this image?')) return;
    this.productService.deleteImage(imageId).subscribe({
      next: () => { color.images = color.images.filter((img: any) => img.id !== imageId); },
      error: () => alert('Delete image failed')
    });
  }

  // ── Adjust quantities ─────────────────────────────────
  openAdjust(color: any) {
  this.adjustingColor = color;
  this.adjustSizes = (color.availableSizes ?? []).map((s: any) => ({
    size:       s.size,
    currentQty: s.quantity,
    newQty:     s.quantity
  }));

  const existing = new Set(this.adjustSizes.map((s: any) => s.size));

  ['_2XS','_XS','_S','_M','_L','_XL','_2XL','_3XL','_4XL','_5XL'].forEach(sz => {
    if (!existing.has(sz))
      this.adjustSizes.push({ size: sz, currentQty: 0, newQty: 0 });
  });
}

  closeAdjust() { this.adjustingColor = null; }

saveAdjust() {
  const changed = this.adjustSizes.filter(s => s.newQty !== s.currentQty);

  if (!changed.length) {
    this.closeAdjust();
    return;
  }

  const body = {
    colorId: this.adjustingColor.id,
    adjustments: changed.map(s => ({
      size: this.sizeMapping[s.size],
      quantity: Number(s.newQty) - Number(s.currentQty)  // الفرق مش القيمة الجديدة
    }))
  };

  this.productService.adjustSizeQuantity(body).subscribe({
    next: () => {
      this.closeAdjust();
      this.loadProduct();
    },
    error: () => {
      this.toast.error('Failed to adjust quantities');
    }
  });
}
  // ── Add new color ─────────────────────────────────────
  onNewColorImage(event: any) {
    this.newColor.mainImage = event.target.files[0];
  }

  // ✅ FIX: accumulate files — don't replace, add to existing list
  onNewColorAdditionalImages(event: any) {
    const incoming: File[] = Array.from(event.target.files as FileList);
    this.newColor.additionalImages = [...this.newColor.additionalImages, ...incoming];
  }

  // ✅ Remove a specific additional image by index
  removeAdditionalImage(index: number) {
    this.newColor.additionalImages.splice(index, 1);
  }

  addNewColor() {
    this.isAddingColor = true;
    const token = localStorage.getItem('token') || '';

    const fd = new FormData();
    fd.append('ProductId',  String(this.productId));
    fd.append('ColorName',  this.newColor.colorName);
    fd.append('ColorCode',  this.newColor.colorCode);
    if (this.newColor.mainImage) fd.append('Image', this.newColor.mainImage);

    // ✅ Each additional image appended separately — server receives them all
    this.newColor.additionalImages.forEach(f => fd.append('AdditionalImages', f));

    const validSizes = this.newColorSizes.filter(s => s.quantity > 0);
    fd.append('Sizes', JSON.stringify(
      validSizes.map(s => ({
        size:     this.sizeMapping[s.name],
        quantity: Number(s.quantity),
        a: 0, b: 0, c: 0
      }))
    ));

    this.productService.createProductColor(fd, token).subscribe({
      next: () => {
        this.isAddingColor = false;
        // ✅ Full reset including additionalImages
        this.newColor = {
          colorName:        '',
          colorCode:        '#000000',
          mainImage:        null,
          additionalImages: []
        };
  this.newColorSizes = [
  '_2XS','_XS','_S','_M','_L','_XL','_2XL','_3XL','_4XL','_5XL'
].map(n => ({ name: n, quantity: 0 }));
        this.loadProduct();
      },
error: (err: any) => {
  this.isAddingColor = false;
  const msg = err?.error?.message || err?.error?.description || 'Add color failed';
  this.toast.error(msg); // بدل alert
}
    });
  }
}
