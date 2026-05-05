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

 form: any = {
  name: '',
  email: '',
  phoneNumber: '',
  commercialRegisterNumber: '',   // ✅ مهم
  taxIdNumber: '',                // ✅ مهم
  description: '',
  state: '',
  city: '',
  street: '',
  buildingNumber: '',

  managerEmail: '',
  managerFirstName: '',
  managerLastName: '',
  managerPhone: '',
  password: '',
  confirmPassword: ''
};

  constructor(private service: FactoryForAdminService,    private toast: ToastService,
) {}

  ngOnInit(): void {
    this.loadFactory(1);
  }

  // ================= GET =================
  loadFactory(id: number) {
    this.loading = true;

    this.service.getFactoryProfile(id).subscribe({
      next: (res: any) => {
        this.factory = res?.data || res;

  if (res) {
    this.factory = res.data;
    this.showFactoryModal = false; // 👈 مهم
  }
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

          managerEmail: '',
          managerFirstName: '',
          managerLastName: '',
          managerPhone: '',
          password: '',
          confirmPassword: ''
        };

        this.loading = false;
      },

      error: () => this.loading = false
    });

  }

  // ================= MODAL =================
  openFactoryModal() {
    this.showFactoryModal = true;
  }

  closeAddModal() {
    this.showFactoryModal = false;
  }

  // ================= FILE =================
  onFileChange(event: any) {
    this.selectedFile = event.target.files[0];
  }

  // ================= ADD FACTORY =================
  addFactory() {

    const formData = new FormData();

    // Manager (REQUIRED)
    formData.append('ManagerEmail', this.form.managerEmail);
    formData.append('ManagerFirstName', this.form.managerFirstName);
    formData.append('ManagerLastName', this.form.managerLastName);
    formData.append('ManagerPhoneNumber', this.form.managerPhone);
    formData.append('ManagerPassword', this.form.password);
    formData.append('ManagerConfirmPassword', this.form.confirmPassword);

    // Factory
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

    if (this.selectedFile) {
      formData.append('FactoryLogo', this.selectedFile);
    }

    this.service.createFactory(formData).subscribe({
      next: () => {
        this.closeAddModal();
        this.loadFactory(1);
        this.toast.success('Factory created successfully');
      },
      error: (err) => {
        console.error(err);
        this.toast.error('Error creating factory');
      }
    });
  }

  // ================= UPDATE =================
  toggleEdit() {
    this.editMode = !this.editMode;
  }

save() {

  const body = {
    providedFactoryId: this.factory?.id, // 🔥 مهم جدا

    name: this.form.name,
    email: this.form.email,
    phoneNumber: this.form.phoneNumber,
    commercialRegisterNumber: this.form.commercialRegisterNumber,
    taxIdNumber: this.form.taxIdNumber,
    description: this.form.description,

    address: {
      state: this.form.state,
      city: this.form.city,
      street: this.form.street,
      buildingNumber: this.form.buildingNumber
    }
  };

  console.log(body);

  this.service.updateFactoryProfile(body).subscribe({
    next: () => {
      this.editMode = false;
      this.loadFactory(this.factory.id);
    },
    error: (err) => console.error(err)
  });
}
  uploadLogo() {
    if (!this.selectedFile) return;

    this.service.updateFactoryImage(this.factory.id, this.selectedFile)
      .subscribe(() => this.loadFactory(this.factory.id));
  }

  // ================= DELETE =================
  deleteFactory() {
    if (!this.factory?.id) return;

    const reason = prompt('Enter reason for deleting factory:');
    if (!reason) return;

    this.service.deleteFactory(this.factory.id, reason).subscribe({
      next: () => {
        this.factory = null;
        alert('Factory deleted');
      },
      error: (err) => console.error(err)
    });
  }

}
