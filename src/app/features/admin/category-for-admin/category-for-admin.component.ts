import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HandelCategoryesForAdminService } from '../../../core/services/handel-categoryes-for-admin.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-category-for-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './category-for-admin.component.html',
  styleUrl: './category-for-admin.component.css'
})
export class CategoryForAdminComponent implements OnInit {

  productCategories: any[] = [];
  assetCategories: any[] = [];

  activeTab: 'product' | 'asset' = 'product';

  name = '';
  editId: number | null = null;
  editMode = false;
  selectedImage: File | null = null;

  constructor(
    private service: HandelCategoryesForAdminService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.loadAll();
  }

  // ================= LOAD =================

  loadAll() {
    this.service.getProductCategories().subscribe({
      next: (res: any) => {
        this.productCategories = res?.data ?? res ?? [];
      },
      error: (e: Error) => this.toast.error(e.message)
    });

    this.service.getAssetCategories().subscribe({
      next: (res: any) => {
        this.assetCategories = res?.data ?? res ?? [];
      },
      error: (e: Error) => this.toast.error(e.message)
    });
  }

  onFileChange(event: any) {
    this.selectedImage = event.target.files[0] ?? null;
  }

  // ================= SWITCH =================

  setTab(tab: 'product' | 'asset') {
    this.activeTab = tab;
    this.reset();
  }

  // ================= PRODUCT =================

  addProduct() {
    if (!this.name.trim()) {
      this.toast.warning('Category name is required');
      return;
    }
    if (!this.selectedImage) {
      this.toast.warning('Category image is required');
      return;
    }
    const fd = new FormData();
    fd.append('Name', this.name.trim());
    fd.append('Image', this.selectedImage);

    this.service.addProductCategory(fd).subscribe({
      next: () => {
        this.toast.success('Category added successfully');
        this.loadAll();
        this.reset();
      },
      error: (e: Error) => this.toast.error(e.message)
    });
  }

  editProduct(cat: any) {
    this.editMode = true;
    this.editId = cat.id;
    this.name = cat.name;
    this.selectedImage = null;
  }

  updateProduct() {
    if (!this.name.trim()) {
      this.toast.warning('Category name is required');
      return;
    }
    const fd = new FormData();
    fd.append('Name', this.name.trim());
    if (this.selectedImage) {
      fd.append('Image', this.selectedImage);
    }
    this.service.updateProductCategory(this.editId!, fd).subscribe({
      next: () => {
        this.toast.success('Category updated successfully');
        this.loadAll();
        this.reset();
      },
      error: (e: Error) => this.toast.error(e.message)
    });
  }

  deleteProduct(id: number) {
    this.service.deleteProductCategory(id).subscribe({
      next: () => {
        this.toast.success('Category deleted');
        this.loadAll();
      },
      error: (e: Error) => this.toast.error(e.message)
    });
  }

  // ================= ASSET =================

  addAsset() {
    if (!this.name.trim()) {
      this.toast.warning('Category name is required');
      return;
    }
    this.service.addAssetCategory({ name: this.name.trim() }).subscribe({
      next: () => {
        this.toast.success('Category added successfully');
        this.loadAll();
        this.reset();
      },
      error: (e: Error) => this.toast.error(e.message)
    });
  }

  editAsset(cat: any) {
    this.editMode = true;
    this.editId = cat.id;
    this.name = cat.name;
  }

  updateAsset() {
    if (!this.name.trim()) {
      this.toast.warning('Category name is required');
      return;
    }
    this.service.updateAssetCategory(this.editId!, {
      id: this.editId,
      name: this.name.trim()
    }).subscribe({
      next: () => {
        this.toast.success('Category updated successfully');
        this.loadAll();
        this.reset();
      },
      error: (e: Error) => this.toast.error(e.message)
    });
  }

  deleteAsset(id: number) {
    this.service.deleteAssetCategory(id).subscribe({
      next: () => {
        this.toast.success('Category deleted');
        this.loadAll();
      },
      error: (e: Error) => this.toast.error(e.message)
    });
  }

  reset() {
    this.name = '';
    this.editId = null;
    this.editMode = false;
    this.selectedImage = null;
  }
}
