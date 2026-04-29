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

  selectedFile!: File;

  form: any = {
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
    buildingNumber: ''
  };

  constructor(private service: ShippingCompanyForAdminService) {}

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
    this.service.updateCompanyProfile(this.form).subscribe(() => {
      this.editMode = false;
      this.loadCompany(this.company.id);
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

  deleteCompany() {
    alert('Delete API not ready yet 🚧');
  }
}
