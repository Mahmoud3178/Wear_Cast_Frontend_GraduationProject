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

  form: any = {
    // Company
    name: '',
    email: '',
    phoneNumber: '',
    commercialRegisterNumber: '',
    taxIdNumber: '',
    description: '',
    deliveryFee: 0,
    state: '',
    city: '',
    street: '',
    buildingNumber: '',

    // Manager (REQUIRED)
    managerEmail: '',
    managerFirstName: '',
    managerLastName: '',
    managerPhone: '',
    password: '',
    confirmPassword: ''
  };

  constructor(private service: ShippingCompanyForAdminService,    private toast: ToastService,
) {}

  ngOnInit(): void {
    this.loadCompany(1); // 👈 غيرها حسب ال id
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

        // ✅ الصح هنا
        state: this.company?.address?.state,
        city: this.company?.address?.city,
        street: this.company?.address?.street,
        buildingNumber: this.company?.address?.buildingNumber
      };

      this.loading = false;
    },
    error: () => this.loading = false
  });
}

  toggleEdit() {
    this.editMode = !this.editMode;
  }

save() {

  const body = {
    providedCompanyId: this.company?.id, // 🔥 الاسم الصح

    name: this.form.name,
    email: this.form.email,
    phoneNumber: this.form.phoneNumber,
    commercialRegisterNumber: this.form.commercialRegisterNumber,
    taxIdNumber: this.form.taxIdNumber,
    description: this.form.description,
    deliveryFee: this.form.deliveryFee,

    address: {
      state: this.form.state,
      city: this.form.city,
      street: this.form.street,
      buildingNumber: this.form.buildingNumber
    }
  };

  console.log(body);

  this.service.updateCompanyProfile(body).subscribe({
    next: () => {
      this.editMode = false;
      this.loadCompany(this.company.id);
    },
    error: (err) => console.error(err)
  });
}
  onFileChange(event: any) {
    this.selectedFile = event.target.files[0];
  }

  uploadLogo() {
    if (!this.selectedFile) return;

    this.service.updateLogo(this.company.id, this.selectedFile).subscribe(() => {
      this.loadCompany(this.company.id);
    });
  }
 addCompany() {

  const formData = new FormData();

  // ================= Manager =================
  formData.append('ManagerEmail', this.form.managerEmail);
  formData.append('ManagerFirstName', this.form.managerFirstName);
  formData.append('ManagerLastName', this.form.managerLastName);
  formData.append('ManagerPhoneNumber', this.form.managerPhone);
  formData.append('ManagerPassword', this.form.password);
  formData.append('ManagerConfirmPassword', this.form.confirmPassword);

  // ================= Company =================
  formData.append('CompanyName', this.form.name);
  formData.append('CompanyEmail', this.form.email);
  formData.append('CompanyPhoneNumber', this.form.phoneNumber);

  // 🔥 REQUIRED FIXES (المهمين اللي كانوا ناقصين)
  formData.append('Description', this.form.description || '');
  formData.append('TaxIdNumber', this.form.taxIdNumber || '');
  formData.append('CommercialRegisterNumber', this.form.commercialRegisterNumber || '');
  formData.append('CompanyState', this.form.state || '');

  // address
  formData.append('CompanyCity', this.form.city || '');
  formData.append('CompanyStreet', this.form.street || '');
  formData.append('CompanyBuildingNumber', this.form.buildingNumber || '');

  // optional
  formData.append('DeliveryFee', this.form.deliveryFee?.toString() || '0');

  // logo (IMPORTANT)
  if (this.selectedFile) {
    formData.append('CompanyLogo', this.selectedFile);
  }

  this.service.createCompany(formData).subscribe({
    next: () => {
      this.closeAddModal();
      this.loadCompany(1);
      this.toast.success('Company created successfully');
    },
    error: (err) => {
      console.error(err);
      this.toast.error('Error creating company');
    }
  });
}

    openCompanyModal() {
    this.showCompanyModal = true;
  }

  closeAddModal() {
    this.showCompanyModal = false;
  }

deleteCompany() {
  if (!this.company?.id) return;

  const reason = prompt('Enter reason for deleting company:');
  if (!reason) return;

  this.service.deleteCompany(this.company.id, reason).subscribe({
    next: () => {
      this.toast.success('Company deleted');
      this.company = null;
    },
    error: (err) => {
      console.error(err);
      this.toast.error('Delete failed');
    }
  });
}
}
