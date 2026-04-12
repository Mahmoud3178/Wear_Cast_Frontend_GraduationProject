import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import {
  FactoryApiService,
  TARGET_AUDIENCE_OPTIONS,
  DRESS_STYLE_OPTIONS,
  VIEW_SIDE,
  WEARCAST_SIZE_ENUM_STRINGS,
  type CategoryDto,
  type CreateDesignedProductPayload,
  type WearcastSizeString
} from '../../../core/services/factory-api.service';
import { DesignCatalogService } from '../../../core/services/design-catalog.service';

function resolveCategoryId(c: CategoryDto | undefined): number {
  if (!c) {
    return 0;
  }
  const v = c.id ?? c.Id;
  return typeof v === 'number' ? v : 0;
}

function sortCategories(rows: CategoryDto[]): CategoryDto[] {
  return [...rows].sort((a, b) =>
    String(a.name ?? a.Name ?? '').localeCompare(
      String(b.name ?? b.Name ?? ''),
      undefined,
      { sensitivity: 'base' }
    )
  );
}

function mergeNestedProductShape(
  dto: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...dto };
  const nestKeys = [
    'designedProduct',
    'DesignedProduct',
    'factoryProduct',
    'FactoryProduct',
    'product',
    'Product',
    'details',
    'Details'
  ];
  for (const k of nestKeys) {
    const v = dto[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const sub = v as Record<string, unknown>;
      for (const [sk, sv] of Object.entries(sub)) {
        if (out[sk] === undefined) {
          out[sk] = sv;
        }
      }
    }
  }
  return out;
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return '';
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) {
    return parseFloat(v);
  }
  return null;
}

@Component({
  selector: 'app-factory-product-wizard',
  standalone: true,
  imports: [FormsModule, NgIf, NgFor, RouterLink],
  templateUrl: './factory-product-wizard.component.html',
  styleUrl: './factory-product-wizard.component.css'
})
export class FactoryProductWizardComponent implements OnInit {
  readonly targetAudienceOptions = TARGET_AUDIENCE_OPTIONS;
  readonly dressStyleOptions = DRESS_STYLE_OPTIONS;
  readonly sizeOptions: ReadonlyArray<{ label: string; value: WearcastSizeString }> =
    WEARCAST_SIZE_ENUM_STRINGS.map(v => ({
      value: v,
      label: v.replace(/^_/, '')
    }));

  factoryId: number | null;
  categories: CategoryDto[] = [];

  /** Backend rejects `0`; pick at least one non-zero audience. */
  selectedAudiences: number[] = [4];

  createForm = {
    name: '',
    description: '',
    price: 29.99,
    canvasWidth: 400,
    canvasHeight: 480,
    categoryId: 1,
    dressStyle: 1
  };

  productId: number | null = null;

  colorForm = { name: 'Black', hexCode: '#1a1a1a' };
  colorId: number | null = null;

  mainImageFile: File | null = null;

  frontImageFile: File | null = null;
  backImageFile: File | null = null;
  rightImageFile: File | null = null;
  leftImageFile: File | null = null;

  /** Matches backend `Size` enum serialized as string (e.g. `_M`). */
  sizeForm = { size: '_M' as WearcastSizeString, a: 26.5, b: 20, c: 24.5 };

  busy = false;
  message = '';
  error = '';

  /** Set from route `products/:productId/edit` */
  editProductId: number | null = null;

  get isEditMode(): boolean {
    return this.editProductId != null;
  }

  constructor(
    private readonly auth: AuthService,
    private readonly factory: FactoryApiService,
    private readonly catalog: DesignCatalogService,
    private readonly route: ActivatedRoute
  ) {
    this.factoryId = this.auth.getFactoryId();
  }

  ngOnInit(): void {
    const raw = this.route.snapshot.paramMap.get('productId');
    const parsed = raw ? parseInt(raw, 10) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      this.editProductId = parsed;
    }
    this.loadCategories();
    if (this.editProductId != null) {
      this.loadExistingProduct(this.editProductId);
    }
  }

  loadCategories(): void {
    this.factory.getCategories().subscribe({
      next: rows => {
        this.categories = sortCategories(rows);
        const ids = this.categories.map(c => resolveCategoryId(c)).filter(id => id > 0);
        const current = this.createForm.categoryId;
        const stillValid = ids.includes(current);
        if (!stillValid && ids.length) {
          this.createForm.categoryId = ids[0];
        } else if (!stillValid && !ids.length) {
          this.createForm.categoryId = 1;
        }
      },
      error: () => {
        this.error = 'Could not load categories.';
      }
    });
  }

  toggleAudience(value: number): void {
    if (this.isEditMode) {
      return;
    }
    const i = this.selectedAudiences.indexOf(value);
    if (i >= 0) {
      if (this.selectedAudiences.length <= 1) {
        return;
      }
      this.selectedAudiences.splice(i, 1);
    } else {
      this.selectedAudiences.push(value);
    }
  }

  isAudienceSelected(value: number): boolean {
    return this.selectedAudiences.includes(value);
  }

  pickMainFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.mainImageFile = input.files?.[0] ?? null;
  }

  pickViewFile(ev: Event, side: 'front' | 'back' | 'right' | 'left'): void {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0] ?? null;
    if (side === 'front') this.frontImageFile = f;
    if (side === 'back') this.backImageFile = f;
    if (side === 'right') this.rightImageFile = f;
    if (side === 'left') this.leftImageFile = f;
  }

  private loadExistingProduct(id: number): void {
    this.error = '';
    this.message = '';
    this.busy = true;
    const token = this.auth.getToken();
    this.catalog.fetchDesignedProductDto(id, token).subscribe({
      next: dto => {
        this.busy = false;
        if (!dto) {
          this.error =
            'Could not load this product from the catalog. Stay signed in and ensure this product is published.';
          return;
        }
        this.productId = id;
        this.colorId = null;
        this.catalog.registerDesignedProductId(id);
        this.applyProductDto(dto);
        this.message =
          'Product loaded. You can add more colors, upload photos per color, and add sizes below. Base fields are read-only.';
      },
    });
  }

  private applyProductDto(dto: Record<string, unknown>): void {
    const merged = mergeNestedProductShape(dto);
    this.createForm.name =
      pickStr(merged, [
        'name',
        'Name',
        'productName',
        'ProductName',
        'title',
        'Title'
      ]) || this.createForm.name;
    this.createForm.description =
      pickStr(merged, ['description', 'Description']) ||
      this.createForm.description;
    const price = num(merged['price'] ?? merged['Price']);
    if (price != null) {
      this.createForm.price = price;
    }
    const cw = num(merged['canvasWidth'] ?? merged['CanvasWidth']);
    const ch = num(merged['canvasHeight'] ?? merged['CanvasHeight']);
    if (cw != null) {
      this.createForm.canvasWidth = cw;
    }
    if (ch != null) {
      this.createForm.canvasHeight = ch;
    }
    const cat = num(merged['categoryId'] ?? merged['CategoryId']);
    if (cat != null && cat > 0) {
      this.createForm.categoryId = cat;
    }
    const style = num(merged['dressStyle'] ?? merged['DressStyle']);
    if (style != null && style > 0) {
      this.createForm.dressStyle = style;
    }
    const ta =
      merged['targetAudiences'] ??
      merged['TargetAudiences'] ??
      merged['targetAudience'] ??
      merged['TargetAudience'];
    if (Array.isArray(ta) && ta.length) {
      const nums = ta
        .map(x => (typeof x === 'number' ? x : num(x)))
        .filter((n): n is number => n != null && n > 0);
      if (nums.length) {
        this.selectedAudiences = [...new Set(nums)].sort((a, b) => a - b);
      }
    } else {
      const one = num(ta);
      if (one != null && one > 0) {
        this.selectedAudiences = [one];
      }
    }
  }

  createProduct(): void {
    if (this.isEditMode) {
      return;
    }
    this.error = '';
    this.message = '';
    const fid = this.factoryId;
    if (fid == null) {
      this.error = 'Missing factory id. Sign in with a factory manager account that has factoryId.';
      return;
    }
    if (!this.createForm.name.trim()) {
      this.error = 'Name is required.';
      return;
    }
    if (!this.selectedAudiences.length) {
      this.error = 'Select at least one target audience.';
      return;
    }
    this.busy = true;
    const payload: CreateDesignedProductPayload = {
      name: this.createForm.name.trim(),
      description: this.createForm.description.trim() || this.createForm.name.trim(),
      targetAudiences: [...this.selectedAudiences].sort((a, b) => a - b),
      dressStyle: this.createForm.dressStyle,
      price: this.createForm.price,
      canvasWidth: Math.round(this.createForm.canvasWidth),
      canvasHeight: Math.round(this.createForm.canvasHeight),
      categoryId: this.createForm.categoryId,
      factoryId: fid
    };
    this.factory.createDesignedProduct(payload).subscribe({
      next: ({ productId }) => {
        this.busy = false;
        this.productId = productId;
        this.colorId = null;
        this.catalog.registerDesignedProductId(productId);
        this.message = `Product created (id ${productId}). Add a color next.`;
      },
      error: (e: Error) => {
        this.busy = false;
        this.error = e.message || 'Create failed';
      }
    });
  }

  addColor(): void {
    this.error = '';
    this.message = '';
    if (this.productId == null) {
      this.error = 'Create a product first.';
      return;
    }
    if (!this.colorForm.name.trim()) {
      this.error = 'Color name required.';
      return;
    }
    if (!this.mainImageFile) {
      this.error = 'Catalog image is required.';
      return;
    }
    
    let hex = this.colorForm.hexCode.trim();
    if (!hex.startsWith('#')) {
      hex = '#' + hex;
    }
    this.busy = true;
    this.factory
      .addProductColor(this.productId, {
        name: this.colorForm.name.trim(),
        hexCode: hex,
        image: this.mainImageFile
      })
      .subscribe({
        next: ({ colorId }) => {
          this.busy = false;
          this.colorId = colorId;
          this.message = `Color created (color id ${colorId}). Catalog image uploaded successfully. Upload one or more view images next.`;
        },
        error: (e: Error) => {
          this.busy = false;
          this.error = e.message || 'Add color failed';
        }
      });
  }

  uploadViewImages(): void {
    if (this.colorId == null) {
      this.error = 'Add a color first before uploading view images.';
      return;
    }

    const uploads: any[] = [];
    if (this.frontImageFile) uploads.push(this.factory.uploadColorViewImage(this.colorId, this.frontImageFile, 1));
    if (this.backImageFile) uploads.push(this.factory.uploadColorViewImage(this.colorId, this.backImageFile, 2));
    if (this.rightImageFile) uploads.push(this.factory.uploadColorViewImage(this.colorId, this.rightImageFile, 3));
    if (this.leftImageFile) uploads.push(this.factory.uploadColorViewImage(this.colorId, this.leftImageFile, 4));

    if (uploads.length === 0) {
      this.error = 'Select at least one view image to upload.';
      return;
    }

    this.busy = true;
    this.error = '';
    this.message = '';

    // Wait for all selected uploads to finish
    import('rxjs').then(({ forkJoin }) => {
      forkJoin(uploads).subscribe({
        next: () => {
          this.busy = false;
          this.message = 'View images uploaded successfully. Add sizes below (repeat as needed).';
        },
        error: (e: Error) => {
          this.busy = false;
          this.error = e.message || 'View image upload failed.';
        }
      });
    });
  }

  categoryValue(c: CategoryDto): number {
    return resolveCategoryId(c);
  }

  addSize(): void {
    this.error = '';
    this.message = '';
    if (this.productId == null) {
      this.error = 'Create a product first.';
      return;
    }
    const size = this.sizeForm.size;
    if (!WEARCAST_SIZE_ENUM_STRINGS.includes(size)) {
      this.error = 'Select a valid size.';
      return;
    }
    this.busy = true;
    this.factory
      .addProductSize(this.productId, {
        size,
        a: this.sizeForm.a,
        b: this.sizeForm.b,
        c: this.sizeForm.c
      })
      .subscribe({
        next: () => {
          this.busy = false;
          this.message = `Size ${size} added (a/b/c measurements).`;
        },
        error: (e: Error) => {
          this.busy = false;
          this.error = e.message || 'Add size failed';
        }
      });
  }
}
