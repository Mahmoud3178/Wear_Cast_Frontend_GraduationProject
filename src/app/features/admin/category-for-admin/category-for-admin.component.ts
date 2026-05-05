import { ToastService } from '../../../core/services/toast.service';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HandelCategoryesForAdminService } from '../../../core/services/handel-categoryes-for-admin.service';

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
  constructor(private service: HandelCategoryesForAdminService,    private toast: ToastService  // ← أضف السطر ده
) {}

  ngOnInit() {
    this.loadAll();
  }

  // ================= LOAD =================

  loadAll() {
    this.service.getProductCategories().subscribe((res: any) => {
      this.productCategories = res?.data ?? res;
    });

    this.service.getAssetCategories().subscribe((res: any) => {
      this.assetCategories = res?.data ?? res;
    });
  }
onFileChange(event: any) {
  this.selectedImage = event.target.files[0];
}
  // ================= SWITCH =================

  setTab(tab: 'product' | 'asset') {
    this.activeTab = tab;
    this.reset();
  }

  // ================= PRODUCT =================

addProduct() {

  if (!this.name || !this.selectedImage) {
    this.toast.warning('Name and Image are required');
    return;
  }

  const formData = new FormData();

  formData.append('Name', this.name);
  formData.append('Image', this.selectedImage);

  this.service.addProductCategory(formData)
    .subscribe(() => {
      this.loadAll();
      this.reset();
    });
}
  deleteProduct(id: number) {
    this.service.deleteProductCategory(id)
      .subscribe(() => this.loadAll());
  }

  // ================= ASSET =================

  addAsset() {
    this.service.addAssetCategory({ name: this.name })
      .subscribe(() => {
        this.loadAll();
        this.reset();
      });
  }

  editAsset(cat: any) {
    this.editMode = true;
    this.editId = cat.id;
    this.name = cat.name;
  }

  updateAsset() {
    this.service.updateAssetCategory(this.editId!, {
      id: this.editId,
      name: this.name
    }).subscribe(() => {
      this.loadAll();
      this.reset();
    });
  }

  deleteAsset(id: number) {
    this.service.deleteAssetCategory(id)
      .subscribe(() => this.loadAll());
  }

reset() {
  this.name = '';
  this.editId = null;
  this.editMode = false;
  this.selectedImage = null;
}
}
