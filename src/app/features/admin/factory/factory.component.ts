import { ToastService } from '../../../core/services/toast.service';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FactoryForAdminService } from '../../../core/services/factory-for-admin.service';

@Component({
  selector: 'app-factory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './factory.component.html',
  styleUrl: './factory.component.css'
})
export class FactoryComponent implements OnInit {

  factory: any;
  loading = true;
  editMode = false;
  selectedFile!: File;
  showFactoryModal = false;

  // 👁️ password toggles
  showPassword = false;
  showConfirmPassword = false;

  // ✅ error/success
  errorMessages: string[] = [];
  successMessage = '';

  form: any = {
    name: '', email: '', phoneNumber: '',
    commercialRegisterNumber: '', taxIdNumber: '',
    description: '', state: '', city: '', street: '', buildingNumber: '',
    managerEmail: '', managerFirstName: '', managerLastName: '',
    managerPhone: '', password: '', confirmPassword: ''
  };

  constructor(
    private service: FactoryForAdminService,
    private toast: ToastService
  ) {}

  ngOnInit(): void { this.loadFactory(1); }

  loadFactory(id: number) {
    this.loading = true;
    this.service.getFactoryProfile(id).subscribe({
      next: (res: any) => {
        this.factory = res?.data || res;
        if (res) { this.factory = res.data; this.showFactoryModal = false; }
        this.form = {
          name: this.factory?.name,
          email: this.factory?.email,
          phoneNumber: this.factory?.phoneNumber,
          commercialRegisterNumber: this.factory?.commercialRegisterNumber,
          taxIdNumber: this.factory?.taxIdNumber,
          description: this.factory?.description,
          state: this.factory?.address?.state,
          city: this.factory?.address?.city,
          street: this.factory?.address?.street,
          buildingNumber: this.factory?.address?.buildingNumber,
          managerEmail: '', managerFirstName: '', managerLastName: '',
          managerPhone: '', password: '', confirmPassword: ''
        };
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  toggleEdit() { this.editMode = !this.editMode; }
  togglePassword() { this.showPassword = !this.showPassword; }
  toggleConfirmPassword() { this.showConfirmPassword = !this.showConfirmPassword; }
  openFactoryModal() { this.showFactoryModal = true; }
  closeAddModal() { this.showFactoryModal = false; }
  onFileChange(event: any) { this.selectedFile = event.target.files[0]; }

handleError(err: any) {
  this.errorMessages = [];
  const error = err?.error;

  if (!error) {
    this.errorMessages = ['Something went wrong. Please try again.'];
    return;
  }

  // ✅ Case 1: { validationErrors: { TaxIdNumber: "msg", ... } }  ← باك إند بتاعك
  if (error.validationErrors && typeof error.validationErrors === 'object') {
    for (const key of Object.keys(error.validationErrors)) {
      const val = error.validationErrors[key];
      if (Array.isArray(val)) {
        this.errorMessages.push(...val);
      } else {
        this.errorMessages.push(val);
      }
    }
    return;
  }

  // ✅ Case 2: { errors: { FieldName: ["msg"] } }  ← ASP.NET ModelState
  if (error.errors && typeof error.errors === 'object') {
    for (const key of Object.keys(error.errors)) {
      const val = error.errors[key];
      if (Array.isArray(val)) {
        this.errorMessages.push(...val);
      } else {
        this.errorMessages.push(val);
      }
    }
    return;
  }

  // ✅ Case 3: { messages: ["msg1", "msg2"] }
  if (Array.isArray(error.messages)) {
    this.errorMessages = error.messages;
    return;
  }

  // ✅ Case 4: { message: "msg" }
  if (error.message) {
    this.errorMessages = [error.message];
    return;
  }

  // Fallback
  this.errorMessages = ['Something went wrong. Please try again.'];
}

  addFactory() {
    this.errorMessages = [];
    const formData = new FormData();
    formData.append('ManagerEmail', this.form.managerEmail);
    formData.append('ManagerFirstName', this.form.managerFirstName);
    formData.append('ManagerLastName', this.form.managerLastName);
    formData.append('ManagerPhoneNumber', this.form.managerPhone);
    formData.append('ManagerPassword', this.form.password);
    formData.append('ManagerConfirmPassword', this.form.confirmPassword);
    formData.append('FactoryName', this.form.name);
    formData.append('FactoryEmail', this.form.email);
    formData.append('FactoryPhoneNumber', this.form.phoneNumber);
    formData.append('FactoryCommercialRegisterNumber', this.form.commercialRegisterNumber || '');
    formData.append('FactoryTaxIdNumber', this.form.taxIdNumber || '');
    formData.append('FactoryDescription', this.form.description || '');
    formData.append('FactoryState', this.form.state || '');
    formData.append('FactoryCity', this.form.city || '');
    formData.append('FactoryStreet', this.form.street || '');
    formData.append('FactoryBuildingNumber', this.form.buildingNumber || '');
    if (this.selectedFile) formData.append('FactoryLogo', this.selectedFile);

    this.service.createFactory(formData).subscribe({
      next: () => {
        this.closeAddModal();
        this.loadFactory(1);
        this.toast.success('Factory created successfully');
      },
      error: (err) => this.handleError(err)
    });
  }

  save() {
    this.errorMessages = [];
    const body = {
      providedFactoryId: this.factory?.id,
      name: this.form.name, email: this.form.email,
      phoneNumber: this.form.phoneNumber,
      commercialRegisterNumber: this.form.commercialRegisterNumber,
      taxIdNumber: this.form.taxIdNumber,
      description: this.form.description,
      address: {
        state: this.form.state, city: this.form.city,
        street: this.form.street, buildingNumber: this.form.buildingNumber
      }
    };
    this.service.updateFactoryProfile(body).subscribe({
      next: () => {
        this.editMode = false;
        this.successMessage = 'Factory updated successfully!';
        this.loadFactory(this.factory.id);
      },
      error: (err) => this.handleError(err)
    });
  }

  uploadLogo() {
    if (!this.selectedFile) return;
    this.service.updateFactoryImage(this.factory.id, this.selectedFile)
      .subscribe(() => this.loadFactory(this.factory.id));
  }

  deleteFactory() {
    if (!this.factory?.id) return;
    const reason = prompt('Enter reason for deleting factory:');
    if (!reason) return;
    this.service.deleteFactory(this.factory.id, reason).subscribe({
      next: () => {
        this.factory = null;
        this.toast.success('Factory deleted');
      },
      error: (err) => this.handleError(err)
    });
  }
}
