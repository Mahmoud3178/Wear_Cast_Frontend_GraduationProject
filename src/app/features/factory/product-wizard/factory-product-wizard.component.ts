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
  if (!c) return 0;
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

function mergeNestedProductShape(dto: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...dto };
  const nestKeys = ['designedProduct','DesignedProduct','factoryProduct','FactoryProduct','product','Product','details','Details'];
  for (const k of nestKeys) {
    const v = dto[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const [sk, sv] of Object.entries(v as Record<string, unknown>)) {
        if (out[sk] === undefined) out[sk] = sv;
      }
    }
  }
  return out;
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) return parseFloat(v);
  return null;
}

export interface SavedColor {
  colorId: number;
  name: string;
  hexCode: string;
  imageUrl: string | null;
}

export interface ExistingSizeRow {
  id: number | null;
  size: WearcastSizeString;
  a: number;
  b: number;
  c: number;
}

/** Wizard step for create mode */
export type WizardStep = 'base' | 'color' | 'photos' | 'sizes';

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
    WEARCAST_SIZE_ENUM_STRINGS.map(v => ({ value: v, label: v.replace(/^_/, '') }));

  factoryId: number | null;
  categories: CategoryDto[] = [];

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

  // ── Color step ─────────────────────────────────────────────────────────────
  colorForm = { name: 'Black', hexCode: '#1a1a1a' };
  currentColorId: number | null = null;
  mainImageFile: File | null = null;

  // View images
  frontImageFile: File | null = null;
  backImageFile: File | null = null;
  rightImageFile: File | null = null;
  leftImageFile: File | null = null;

  // ── Saved colors (create + edit) ────────────────────────────────────────────
  savedColors: SavedColor[] = [];
  selectedDefaultColorId: number | null = null;

  // ── Sizes ───────────────────────────────────────────────────────────────────
  sizeForm = { size: '_M' as WearcastSizeString, a: 26.5, b: 20, c: 24.5 };
  existingSizes: ExistingSizeRow[] = [];
  editingSizeId: number | null = null;
  sizeEditForm = { size: '_M' as WearcastSizeString, a: 26.5, b: 20, c: 24.5 };
  categoryPreviewImageUrl: string | null = null;

  // ── State ───────────────────────────────────────────────────────────────────
  busy = false;
  message = '';
  error = '';

  /** Current step in create wizard */
  currentStep: WizardStep = 'base';

  /** Set from route `products/:productId/edit` */
  editProductId: number | null = null;

  // ── Edit mode: color being edited ──────────────────────────────────────────
  editingColorId: number | null = null;
  editColorForm = { name: '', hexCode: '' };
  editColorMainFile: File | null = null;
  editColorFrontFile: File | null = null;
  editColorBackFile: File | null = null;
  editColorRightFile: File | null = null;
  editColorLeftFile: File | null = null;

  get isEditMode(): boolean { return this.editProductId != null; }

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

  // ── Helpers ──────────────────────────────────────────────────────────────────

  loadCategories(): void {
    this.factory.getCategories().subscribe({
      next: rows => {
        this.categories = sortCategories(rows);
        const ids = this.categories.map(c => resolveCategoryId(c)).filter(id => id > 0);
        if (!ids.includes(this.createForm.categoryId) && ids.length) {
          this.createForm.categoryId = ids[0];
        }
      },
      error: () => { this.error = 'Could not load categories.'; }
    });
  }

  toggleAudience(value: number): void {
    const i = this.selectedAudiences.indexOf(value);
    if (i >= 0) {
      if (this.selectedAudiences.length <= 1) return;
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

  pickEditColorMainFile(ev: Event): void {
    this.editColorMainFile = (ev.target as HTMLInputElement).files?.[0] ?? null;
  }

  pickEditColorViewFile(ev: Event, side: 'front' | 'back' | 'right' | 'left'): void {
    const f = (ev.target as HTMLInputElement).files?.[0] ?? null;
    if (side === 'front') this.editColorFrontFile = f;
    if (side === 'back') this.editColorBackFile = f;
    if (side === 'right') this.editColorRightFile = f;
    if (side === 'left') this.editColorLeftFile = f;
  }

  categoryValue(c: CategoryDto): number { return resolveCategoryId(c); }

  onCategoryChanged(categoryId: number): void {
    this.createForm.categoryId = categoryId;
    this.loadCategoryPreviewImage(categoryId);
  }

  // ── Create wizard steps ──────────────────────────────────────────────────────

  createProduct(): void {
    this.error = '';
    this.message = '';
    const fid = this.factoryId;
    if (fid == null) { this.error = 'Missing factory id. Sign in with a factory manager account.'; return; }
    if (!this.createForm.name.trim()) { this.error = 'Name is required.'; return; }
    if (!this.selectedAudiences.length) { this.error = 'Select at least one target audience.'; return; }
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
        this.catalog.registerDesignedProductId(productId);
        this.loadCategoryPreviewImage(this.createForm.categoryId);
        this.currentStep = 'color';
        this.message = `Product created! Now add your first color.`;
      },
      error: (e: Error) => { this.busy = false; this.error = e.message || 'Create failed'; }
    });
  }

  addColor(): void {
    this.error = '';
    this.message = '';
    if (this.productId == null) { this.error = 'Create a product first.'; return; }
    if (!this.colorForm.name.trim()) { this.error = 'Color name required.'; return; }
    if (!this.mainImageFile) { this.error = 'Catalog image is required for the color.'; return; }
    let hex = this.colorForm.hexCode.trim();
    if (!hex.startsWith('#')) hex = '#' + hex;
    this.busy = true;
    this.factory.addProductColor(this.productId, {
      name: this.colorForm.name.trim(),
      hexCode: hex,
      image: this.mainImageFile
    }).subscribe({
      next: ({ colorId }) => {
        this.busy = false;
        this.currentColorId = colorId;
        this.savedColors.push({ colorId, name: this.colorForm.name.trim(), hexCode: hex, imageUrl: null });
        this.currentStep = 'photos';
        this.message = `Color "${this.colorForm.name}" added! Now upload view photos for it.`;
      },
      error: (e: Error) => { this.busy = false; this.error = e.message || 'Add color failed'; }
    });
  }

  uploadViewImages(): void {
    if (this.currentColorId == null) { this.error = 'Add a color first.'; return; }
    const uploads: any[] = [];
    if (this.frontImageFile) uploads.push(this.factory.replaceColorViewImage(this.currentColorId, this.frontImageFile, 1));
    if (this.backImageFile) uploads.push(this.factory.replaceColorViewImage(this.currentColorId, this.backImageFile, 2));
    if (this.rightImageFile) uploads.push(this.factory.replaceColorViewImage(this.currentColorId, this.rightImageFile, 3));
    if (this.leftImageFile) uploads.push(this.factory.replaceColorViewImage(this.currentColorId, this.leftImageFile, 4));
    if (uploads.length === 0) { this.error = 'Select at least one view image.'; return; }
    this.busy = true;
    this.error = '';
    this.message = '';
    forkJoin(uploads).subscribe({
      next: () => {
        this.busy = false;
        this.message = 'Photos uploaded! You can add another color or move on to sizes.';
        this.currentStep = 'sizes';
        this._resetColorForms();
      },
      error: (e: Error) => { this.busy = false; this.error = e.message || 'Upload failed.'; }
    });
  }

  /** Skip view photos and go to the next step */
  skipPhotos(): void {
    this.currentStep = 'sizes';
    this._resetColorForms();
    this.message = 'Skipped photos. You can add another color or add sizes.';
  }

  /** From the sizes step, go back to add another color */
  addAnotherColor(): void {
    this._resetColorForms();
    this.currentStep = 'color';
    this.message = '';
    this.error = '';
  }

  private _resetColorForms(): void {
    this.colorForm = { name: '', hexCode: '#000000' };
    this.mainImageFile = null;
    this.frontImageFile = null;
    this.backImageFile = null;
    this.rightImageFile = null;
    this.leftImageFile = null;
    this.currentColorId = null;
  }

  addSize(): void {
    this.error = '';
    this.message = '';
    if (this.productId == null) { this.error = 'Create a product first.'; return; }
    const size = this.sizeForm.size;
    if (!WEARCAST_SIZE_ENUM_STRINGS.includes(size)) { this.error = 'Select a valid size.'; return; }
    this.busy = true;
    this.factory.addProductSize(this.productId, {
      size, a: this.sizeForm.a, b: this.sizeForm.b, c: this.sizeForm.c
    }).subscribe({
      next: ({ id }) => {
        this.busy = false;
        this.existingSizes = [
          ...this.existingSizes,
          { id: id ?? null, size, a: this.sizeForm.a, b: this.sizeForm.b, c: this.sizeForm.c }
        ];
        if (id == null && this.isEditMode && this.productId != null) {
          // Some API variants do not return created size id; re-fetch to discover ids.
          this.loadExistingProduct(this.productId);
        }
        this.message = `Size ${size.replace(/^_/, '')} added.`;
      },
      error: (e: Error) => { this.busy = false; this.error = e.message || 'Add size failed'; }
    });
  }

  startEditSize(row: ExistingSizeRow): void {
    if (row.id == null) {
      this.error = 'This size row cannot be edited because no size id was returned by the API.';
      return;
    }
    this.editingSizeId = row.id;
    this.sizeEditForm = { size: row.size, a: row.a, b: row.b, c: row.c };
  }

  cancelEditSize(): void {
    this.editingSizeId = null;
  }

  saveEditedSize(): void {
    if (this.editingSizeId == null) return;
    this.error = '';
    this.message = '';
    this.busy = true;
    this.factory.updateProductSize(this.editingSizeId, {
      size: this.sizeEditForm.size,
      a: this.sizeEditForm.a,
      b: this.sizeEditForm.b,
      c: this.sizeEditForm.c
    }).subscribe({
      next: () => {
        this.busy = false;
        this.existingSizes = this.existingSizes.map(s =>
          s.id === this.editingSizeId
            ? {
                ...s,
                size: this.sizeEditForm.size,
                a: this.sizeEditForm.a,
                b: this.sizeEditForm.b,
                c: this.sizeEditForm.c
              }
            : s
        );
        this.message = `Size ${this.sizeEditForm.size.replace(/^_/, '')} updated.`;
        this.editingSizeId = null;
      },
      error: (e: Error) => {
        this.busy = false;
        this.error = e.message || 'Update size failed';
      }
    });
  }

  deleteSize(row: ExistingSizeRow): void {
    if (row.id == null) {
      this.error = 'This size row cannot be deleted because no size id was returned by the API.';
      return;
    }
    if (!confirm(`Delete size ${row.size.replace(/^_/, '')}?`)) {
      return;
    }
    this.error = '';
    this.message = '';
    this.busy = true;
    this.factory.deleteProductSize(row.id).subscribe({
      next: () => {
        this.busy = false;
        this.existingSizes = this.existingSizes.filter(s => s.id !== row.id);
        if (this.editingSizeId === row.id) {
          this.editingSizeId = null;
        }
        this.message = `Size ${row.size.replace(/^_/, '')} deleted.`;
      },
      error: (e: Error) => {
        this.busy = false;
        this.error = e.message || 'Delete size failed';
      }
    });
  }

  // ── Edit mode ────────────────────────────────────────────────────────────────

  private loadExistingProduct(id: number): void {
    this.error = '';
    this.message = '';
    this.busy = true;
    const token = this.auth.getToken();
    this.catalog.fetchDesignedProductDto(id, token).subscribe({
      next: dto => {
        this.busy = false;
        if (!dto) { this.error = 'Could not load product.'; return; }
        this.productId = id;
        this.catalog.registerDesignedProductId(id);
        this.applyProductDto(dto);
        this.existingSizes = this.extractSizesFromDto(dto);
        this.loadCategoryPreviewImage(this.createForm.categoryId);
        this.extractColorsFromDto(dto);
        this.loadProductColors(id);
      }
    });
  }

  private extractColorsFromDto(dto: Record<string, unknown>): void {
    const colors = dto['colors'] ?? dto['Colors'] ?? dto['productColors'] ?? dto['ProductColors'];
    if (Array.isArray(colors) && colors.length > 0) {
      this.savedColors = colors.map((c: any) => ({
        colorId: c.id ?? c.colorId ?? c.Id ?? c.ColorId ?? 0,
        name: c.name ?? c.Name ?? '',
        hexCode: c.hexCode ?? c.HexCode ?? '',
        imageUrl: c.imageUrl ?? c.ImageUrl ?? c.mainImageUrl ?? c.MainImageUrl ?? null
      }));
    }
  }

  private loadProductColors(productId: number): void {
    this.factory.getProductColors(productId).subscribe({
      next: colors => {
        if (colors.length > 0) this.savedColors = colors;
      },
      error: () => { /* already extracted from DTO */ }
    });
  }

  /** Save all product fields in edit mode */
  saveProductDetails(): void {
    if (this.productId == null) { this.error = 'No product loaded.'; return; }
    this.error = '';
    this.message = '';
    this.busy = true;
    const payload = {
      name: this.createForm.name,
      description: this.createForm.description,
      price: this.createForm.price,
      targetAudiences: this.selectedAudiences.map(a => this.audienceNumToString(a)),
      dressStyle: this.createForm.dressStyle,
      canvasWidth: this.createForm.canvasWidth,
      canvasHeight: this.createForm.canvasHeight,
      categoryId: this.createForm.categoryId,
      defaultColorId: this.selectedDefaultColorId
    };
    this.factory.updateDesignedProduct(this.productId, payload).subscribe({
      next: () => { this.busy = false; this.message = 'Product details saved successfully!'; },
      error: (e: any) => { this.busy = false; this.error = e.message || 'Failed to save.'; }
    });
  }

  /** Start editing a color's name/hex */
  startEditColor(color: SavedColor): void {
    this.editingColorId = color.colorId;
    this.editColorForm = { name: color.name, hexCode: color.hexCode };
    this.editColorMainFile = null;
    this.editColorFrontFile = null;
    this.editColorBackFile = null;
    this.editColorRightFile = null;
    this.editColorLeftFile = null;
  }

  cancelEditColor(): void {
    this.editingColorId = null;
  }

  /** Upload new photos for an existing color in edit mode */
  saveEditColorPhotos(): void {
    const cid = this.editingColorId;
    if (cid == null || this.productId == null) return;
    this.error = '';
    this.message = '';
    const uploads: any[] = [];
    // Use PUT (replace) instead of POST so existing view sides are overwritten
    if (this.editColorFrontFile) uploads.push(this.factory.replaceColorViewImage(cid, this.editColorFrontFile, 1));
    if (this.editColorBackFile) uploads.push(this.factory.replaceColorViewImage(cid, this.editColorBackFile, 2));
    if (this.editColorRightFile) uploads.push(this.factory.replaceColorViewImage(cid, this.editColorRightFile, 3));
    if (this.editColorLeftFile) uploads.push(this.factory.replaceColorViewImage(cid, this.editColorLeftFile, 4));
    if (this.editColorMainFile) uploads.push(this.factory.uploadColorMainImage(this.productId, cid, this.editColorMainFile));
    if (uploads.length === 0) { this.error = 'Select at least one image to upload.'; return; }
    this.busy = true;
    forkJoin(uploads).subscribe({
      next: () => { this.busy = false; this.message = 'Photos uploaded successfully!'; this.editingColorId = null; },
      error: (e: Error) => {
        this.busy = false;
        const msg = e.message ?? '';
        if (/sidealreadyexists|already exists/i.test(msg)) {
          this.error =
            '⚠️ One or more of the selected photos could not be uploaded because that view side already has an image. ' +
            'The current API only supports adding new images, not replacing existing ones. ' +
            'To replace a photo you must delete this color and re-add it with the correct photos. ' +
            'Please ask the backend team to add a PUT endpoint to replace individual view images.';
        } else {
          this.error = msg || 'Upload failed.';
        }
      }
    });
  }

  /** Delete a color from the product */
  deleteColor(color: SavedColor): void {
    if (this.productId == null) return;
    if (!confirm(`Delete color "${color.name}"? This cannot be undone.`)) return;
    this.busy = true;
    this.error = '';
    this.message = '';
    this.factory.deleteProductColor(this.productId, color.colorId).subscribe({
      next: () => {
        this.busy = false;
        this.savedColors = this.savedColors.filter(c => c.colorId !== color.colorId);
        this.message = `Color "${color.name}" deleted.`;
        if (this.selectedDefaultColorId === color.colorId) this.selectedDefaultColorId = null;
        if (this.editingColorId === color.colorId) this.editingColorId = null;
      },
      error: (e: Error) => {
        this.busy = false;
        this.error = e.message || 'Delete failed.';
      }
    });
  }

  /** Add a new color in edit mode (same as create mode color step) */
  addColorInEditMode(): void {
    this.error = '';
    this.message = '';
    if (this.productId == null) { this.error = 'No product loaded.'; return; }
    if (!this.colorForm.name.trim()) { this.error = 'Color name required.'; return; }
    if (!this.mainImageFile) { this.error = 'Catalog image is required.'; return; }
    let hex = this.colorForm.hexCode.trim();
    if (!hex.startsWith('#')) hex = '#' + hex;
    this.busy = true;
    this.factory.addProductColor(this.productId, {
      name: this.colorForm.name.trim(), hexCode: hex, image: this.mainImageFile
    }).subscribe({
      next: ({ colorId }) => {
        // Upload optional view images
        const uploads: any[] = [];
        if (this.frontImageFile) uploads.push(this.factory.replaceColorViewImage(colorId, this.frontImageFile, 1));
        if (this.backImageFile) uploads.push(this.factory.replaceColorViewImage(colorId, this.backImageFile, 2));
        if (this.rightImageFile) uploads.push(this.factory.replaceColorViewImage(colorId, this.rightImageFile, 3));
        if (this.leftImageFile) uploads.push(this.factory.replaceColorViewImage(colorId, this.leftImageFile, 4));
        if (uploads.length === 0) {
          this.busy = false;
          this.savedColors.push({ colorId, name: this.colorForm.name.trim(), hexCode: hex, imageUrl: null });
          this.message = `Color "${this.colorForm.name}" added!`;
          this._resetColorForms();
          return;
        }
        forkJoin(uploads).subscribe({
          next: () => {
            this.busy = false;
            this.savedColors.push({ colorId, name: this.colorForm.name.trim(), hexCode: hex, imageUrl: null });
            this.message = `Color "${this.colorForm.name}" added with photos!`;
            this._resetColorForms();
          },
          error: (e: Error) => {
            this.busy = false;
            this.savedColors.push({ colorId, name: this.colorForm.name.trim(), hexCode: hex, imageUrl: null });
            this.message = `Color added (id ${colorId}) but photo upload failed: ${e.message}`;
            this._resetColorForms();
          }
        });
      },
      error: (e: Error) => { this.busy = false; this.error = e.message || 'Add color failed'; }
    });
  }

  private applyProductDto(dto: Record<string, unknown>): void {
    const merged = mergeNestedProductShape(dto);
    this.createForm.name = pickStr(merged, ['name','Name','productName','ProductName','title','Title']) || this.createForm.name;
    this.createForm.description = pickStr(merged, ['description','Description']) || this.createForm.description;
    const price = num(merged['price'] ?? merged['Price']);
    if (price != null) this.createForm.price = price;
    const cw = num(merged['canvasWidth'] ?? merged['CanvasWidth']);
    const ch = num(merged['canvasHeight'] ?? merged['CanvasHeight']);
    if (cw != null) this.createForm.canvasWidth = cw;
    if (ch != null) this.createForm.canvasHeight = ch;
    const cat = num(merged['categoryId'] ?? merged['CategoryId']);
    if (cat != null && cat > 0) this.createForm.categoryId = cat;
    const style = num(merged['dressStyle'] ?? merged['DressStyle']);
    if (style != null && style > 0) this.createForm.dressStyle = style;
    const ta = merged['targetAudiences'] ?? merged['TargetAudiences'] ?? merged['targetAudience'] ?? merged['TargetAudience'];
    if (Array.isArray(ta) && ta.length) {
      const nums = ta.map(x => this.mapTargetAudienceToNumber(x)).filter((n): n is number => n != null && n > 0);
      if (nums.length) this.selectedAudiences = [...new Set(nums)].sort((a, b) => a - b);
    } else {
      const one = this.mapTargetAudienceToNumber(ta);
      if (one != null && one > 0) this.selectedAudiences = [one];
    }
    const defColor = num(merged['defaultColorId'] ?? merged['DefaultColorId']);
    if (defColor != null && defColor > 0) this.selectedDefaultColorId = defColor;
  }

  private loadCategoryPreviewImage(categoryId: number): void {
    if (!categoryId || categoryId <= 0) {
      this.categoryPreviewImageUrl = null;
      return;
    }
    this.factory.getCategoryById(categoryId).subscribe({
      next: (cat) => {
        this.categoryPreviewImageUrl = cat?.imageUrl ?? null;
      },
      error: () => {
        this.categoryPreviewImageUrl = null;
      }
    });
  }

  private extractSizesFromDto(dto: Record<string, unknown>): ExistingSizeRow[] {
    const merged = mergeNestedProductShape(dto);
    const raw =
      merged['sizeDetails'] ??
      merged['SizeDetails'] ??
      merged['productSizes'] ??
      merged['ProductSizes'] ??
      [];
    if (!Array.isArray(raw)) return [];
    return raw
      .map((r: unknown) => {
        if (!r || typeof r !== 'object') return null;
        const o = r as Record<string, unknown>;
        const rawSize = pickStr(o, ['size', 'Size']);
        if (!rawSize) return null;
        const size = (rawSize.startsWith('_') ? rawSize : `_${rawSize}`) as WearcastSizeString;
        if (!WEARCAST_SIZE_ENUM_STRINGS.includes(size)) return null;
        const id = num(
          o['id'] ??
            o['Id'] ??
            o['sizeId'] ??
            o['SizeId'] ??
            o['productSizeId'] ??
            o['ProductSizeId'] ??
            o['sizeDetailId'] ??
            o['SizeDetailId']
        );
        const a = num(o['a'] ?? o['A']) ?? 0;
        const b = num(o['b'] ?? o['B']) ?? 0;
        const c = num(o['c'] ?? o['C']) ?? 0;
        return { id: id != null ? id : null, size, a, b, c } as ExistingSizeRow;
      })
      .filter((x: ExistingSizeRow | null): x is ExistingSizeRow => !!x);
  }

  private mapTargetAudienceToNumber(value: unknown): number | null {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const map: Record<string, number> = { 'Men':1,'men':1,'Women':2,'women':2,'Unisex':3,'unisex':3,'Kids':4,'kids':4,'Babies':8,'babies':8 };
      return map[value] ?? null;
    }
    return null;
  }

  private audienceNumToString(n: number): string {
    const map: Record<number, string> = { 1:'Men', 2:'Women', 3:'Unisex', 4:'Kids', 8:'Babies' };
    return map[n] ?? 'Unisex';
  }
}
