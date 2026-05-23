import { ToastService } from '../../../core/services/toast.service';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShippingCompanyForAdminService } from '../../../core/services/shipping-company-for-admin.service';

@Component({
  selector: 'app-delivery-company',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './delivery-company.component.html',
  styleUrl: './delivery-company.component.css'
})
export class DeliveryCompanyComponent implements OnInit {

  company: any;
  loading = true;
  editMode = false;
  showCompanyModal = false;
  selectedFile!: File;
wallet: any = null;

  // 👁️ password toggles
  showPassword = false;
  showConfirmPassword = false;

  // ✅ error/success
  errorMessages: string[] = [];
  successMessage = '';

  form: any = {
    name: '', email: '', phoneNumber: '',
    commercialRegisterNumber: '', taxIdNumber: '',
    description: '', deliveryFee: 0,
    state: '', city: '', street: '', buildingNumber: '',
    managerEmail: '', managerFirstName: '', managerLastName: '',
    managerPhone: '', password: '', confirmPassword: ''
  };

  constructor(
    private service: ShippingCompanyForAdminService,
    private toast: ToastService
  ) {}

  ngOnInit(): void { this.loadCompany(1); }

loadWallet() {
  this.service.getCompanyWallet(this.company.id).subscribe({
    next: (res: any) => { this.wallet = res?.data; },
    error: () => { this.wallet = null; }
  });
}
  loadCompany(id: number) {
    this.loading = true;
    this.service.getCompanyProfile(id).subscribe({
      next: (res: any) => {
        this.company = res?.data || res;
        this.form = {
          name: this.company?.name,
          email: this.company?.email,
          phoneNumber: this.company?.phoneNumber,
          commercialRegisterNumber: this.company?.commercialRegisterNumber,
          taxIdNumber: this.company?.taxIdNumber,
          description: this.company?.description,
          deliveryFee: this.company?.deliveryFee,
          state: this.company?.address?.state,
          city: this.company?.address?.city,
          street: this.company?.address?.street,
          buildingNumber: this.company?.address?.buildingNumber
        };
        this.loading = false;
        this.loadWallet();

      },
      error: () => this.loading = false
    });
  }

  toggleEdit() { this.editMode = !this.editMode; }
  togglePassword() { this.showPassword = !this.showPassword; }
  toggleConfirmPassword() { this.showConfirmPassword = !this.showConfirmPassword; }

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

  save() {
    this.errorMessages = [];
    const body = {
      providedCompanyId: this.company?.id,
      name: this.form.name, email: this.form.email,
      phoneNumber: this.form.phoneNumber,
      commercialRegisterNumber: this.form.commercialRegisterNumber,
      taxIdNumber: this.form.taxIdNumber,
      description: this.form.description,
      deliveryFee: this.form.deliveryFee,
      address: {
        state: this.form.state, city: this.form.city,
        street: this.form.street, buildingNumber: this.form.buildingNumber
      }
    };
    this.service.updateCompanyProfile(body).subscribe({
      next: () => {
        this.editMode = false;
        this.successMessage = 'Company updated successfully!';
        this.loadCompany(this.company.id);
      },
      error: (err) => this.handleError(err)
    });
  }

  onFileChange(event: any) { this.selectedFile = event.target.files[0]; }

  uploadLogo() {
    if (!this.selectedFile) return;
    this.service.updateLogo(this.company.id, this.selectedFile).subscribe(() => {
      this.loadCompany(this.company.id);
    });
  }

  addCompany() {
    this.errorMessages = [];
    const formData = new FormData();
    formData.append('ManagerEmail', this.form.managerEmail);
    formData.append('ManagerFirstName', this.form.managerFirstName);
    formData.append('ManagerLastName', this.form.managerLastName);
    formData.append('ManagerPhoneNumber', this.form.managerPhone);
    formData.append('ManagerPassword', this.form.password);
    formData.append('ManagerConfirmPassword', this.form.confirmPassword);
    formData.append('CompanyName', this.form.name);
    formData.append('CompanyEmail', this.form.email);
    formData.append('CompanyPhoneNumber', this.form.phoneNumber);
    formData.append('Description', this.form.description || '');
    formData.append('TaxIdNumber', this.form.taxIdNumber || '');
    formData.append('CommercialRegisterNumber', this.form.commercialRegisterNumber || '');
    formData.append('CompanyState', this.form.state || '');
    formData.append('CompanyCity', this.form.city || '');
    formData.append('CompanyStreet', this.form.street || '');
    formData.append('CompanyBuildingNumber', this.form.buildingNumber || '');
    formData.append('DeliveryFee', this.form.deliveryFee?.toString() || '0');
    if (this.selectedFile) formData.append('CompanyLogo', this.selectedFile);

    this.service.createCompany(formData).subscribe({
      next: () => {
        this.closeAddModal();
        this.loadCompany(1);
        this.toast.success('Company created successfully');
      },
      error: (err) => this.handleError(err)
    });
  }

  openCompanyModal() { this.showCompanyModal = true; }
  closeAddModal() { this.showCompanyModal = false; }

  deleteCompany() {
    if (!this.company?.id) return;
    const reason = prompt('Enter reason for deleting company:');
    if (!reason) return;
    this.service.deleteCompany(this.company.id, reason).subscribe({
      next: () => { this.toast.success('Company deleted'); this.company = null; },
      error: (err) => this.handleError(err)
    });
  }
}
