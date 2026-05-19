import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SellerManagersService } from '../../../core/services/seller-managers.service';

@Component({
  selector: 'app-seller-managers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './seller-managers.component.html',
  styleUrl: './seller-managers.component.css'
})
export class SellerManagersComponent implements OnInit {

  managers: any[] = [];
  isLoading = false;
  errorMsg = '';

  // Add Modal
  showAddModal = false;
  isAdding = false;
  addError = '';
  addFieldErrors: Record<string, string> = {};
  showPassword = false;
  showConfirmPassword = false;
  addForm = {
    firstName: '', lastName: '', email: '',
    phoneNumber: '', password: '', confirmPassword: ''
  };

  // Edit Modal
  showEditModal = false;
  isUpdating = false;
  updateError = '';
  updateFieldErrors: Record<string, string> = {};
  editForm = { firstName: '', lastName: '', phoneNumber: '' };
  selectedEditManager: any = null;

  // Delete Modal
  showDeleteModal = false;
  isDeleting = false;
  deleteError = '';
  deletePassword = '';  // شيلها
deleteReason = '';    // حطها بدلها
  selectedManager: any = null;

  // Toast
  toastMsg = '';
  toastVisible = false;
  toastType: 'success' | 'error' = 'success';

  constructor(private service: SellerManagersService) {}

  ngOnInit() { this.load(); }

  load() {
    this.isLoading = true;
    this.service.getAll().subscribe({
      next: (res: any) => {
        this.managers = res?.data ?? res?.items ?? res ?? [];
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; this.errorMsg = 'Failed to load managers.'; }
    });
  }

  // ── Add ──────────────────────────────────────────────
  openAdd() {
    this.addForm = { firstName: '', lastName: '', email: '', phoneNumber: '', password: '', confirmPassword: '' };
    this.addError = '';
    this.addFieldErrors = {};
    this.showPassword = false;
    this.showConfirmPassword = false;
    this.showAddModal = true;
  }

  closeAdd() { this.showAddModal = false; }

  submitAdd() {
    if (this.addForm.password !== this.addForm.confirmPassword) {
      this.addError = 'Passwords do not match'; return;
    }
    this.isAdding = true;
    this.addError = '';
    this.addFieldErrors = {};

    this.service.create(this.addForm).subscribe({
      next: () => {
        this.isAdding = false;
        this.showAddModal = false;
        this.showToast('Manager added successfully', 'success');
        this.load();
      },
      error: (e: any) => {
        this.isAdding = false;
        const body = e?.error;
        if (body?.validationErrors) {
          const raw = body.validationErrors;
          Object.keys(raw).forEach(k => {
            this.addFieldErrors[k.charAt(0).toLowerCase() + k.slice(1)] = raw[k];
          });
        } else {
          this.addError = body?.description || body?.message || 'Failed to add manager.';
        }
      }
    });
  }

  // ── Edit ─────────────────────────────────────────────
  openEdit(manager: any) {
    this.selectedEditManager = manager;
    this.editForm = {
      firstName: manager.firstName || '',
      lastName: manager.lastName || '',
      phoneNumber: manager.phoneNumber || ''
    };
    this.updateError = '';
    this.updateFieldErrors = {};
    this.showEditModal = true;
  }

  closeEdit() { this.showEditModal = false; this.selectedEditManager = null; }

  submitEdit() {
    this.isUpdating = true;
    this.updateError = '';
    this.updateFieldErrors = {};

    const body = {
      firstName: this.editForm.firstName,
      lastName: this.editForm.lastName,
      phoneNumber: this.editForm.phoneNumber,
      providedManagerId: this.selectedEditManager.id
    };

    this.service.updateProfile(body).subscribe({
      next: () => {
        this.isUpdating = false;
        this.showEditModal = false;
        this.showToast('Manager updated successfully', 'success');
        this.load();
      },
      error: (e: any) => {
        this.isUpdating = false;
        const err = e?.error;
        if (err?.validationErrors) {
          const raw = err.validationErrors;
          Object.keys(raw).forEach(k => {
            this.updateFieldErrors[k.charAt(0).toLowerCase() + k.slice(1)] = raw[k];
          });
        } else {
          this.updateError = err?.description || err?.message || 'Failed to update manager.';
        }
      }
    });
  }

  // ── Delete ───────────────────────────────────────────
openDelete(manager: any) {
  this.selectedManager = manager;
  this.deleteReason = '';
  this.deleteError = '';
  this.showDeleteModal = true;
}

  closeDelete() { this.showDeleteModal = false; this.selectedManager = null; }

submitDelete() {
  if (!this.deleteReason) { this.deleteError = 'Reason is required'; return; }
  this.isDeleting = true;
  this.deleteError = '';
  this.service.delete(this.selectedManager.id, { reason: this.deleteReason }).subscribe({
    next: () => {
      this.isDeleting = false;
      this.showDeleteModal = false;
      this.showToast('Manager deleted successfully', 'success');
      this.load();
    },
error: (e: any) => {
  this.isDeleting = false;
  let err: any;
  try {
    err = typeof e?.error === 'string' ? JSON.parse(e.error) : e?.error;
  } catch { err = e?.error; }

  this.deleteError =
    err?.error?.description ||
    err?.validationErrors?.Reason ||
    err?.description ||
    e?.message ||
    'Failed to delete manager.';
}
  });
}

  // ── Toast ────────────────────────────────────────────
  showToast(msg: string, type: 'success' | 'error' = 'success') {
    this.toastMsg = msg;
    this.toastType = type;
    this.toastVisible = true;
    setTimeout(() => this.toastVisible = false, 3000);
  }
}
