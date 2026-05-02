import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AllCustomersForAdminService } from '../../../core/services/all-customers-for-admin.service';

@Component({
  selector: 'app-customers-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers-details.component.html',
  styleUrl: './customers-details.component.css'
})
export class CustomersDetailsComponent {

  customerId!: number;
  customer: any = {};
  orders: any[] = [];
  deleteReason: string = '';
  selectedFile: File | null = null;

  constructor(
    private route: ActivatedRoute,
    private service: AllCustomersForAdminService
  ) {}

  ngOnInit() {
    this.customerId = +this.route.snapshot.paramMap.get('id')!;
    this.loadCustomer();
  }

  loadCustomer() {
    this.service.getCustomerById(this.customerId).subscribe((res: any) => {

      const c = res.data;

this.customer = {
  id: c.id,
  firstName: c.firstName,
  lastName: c.lastName,
  phoneNumber: c.phoneNumber,
  email: c.email,
  imageurl: c.imageurl || 'https://i.pravatar.cc/100',  // ✅ هنا التعديل
  city: c.address?.city || '',
  state: c.address?.state || '',
  street: c.address?.street || '',
  buildingNumber: c.address?.buildingNumber || ''
};

      this.loadOrders();
    });
  }

  // ================= UPDATE =================
updateCustomer() {

  const body = {
    firstName: this.customer.firstName,
    lastName: this.customer.lastName,
    phoneNumber: this.customer.phoneNumber,
    email: this.customer.email,

    // 🔥 مهم جدًا
    address: {
      city: this.customer.city,
      state: this.customer.state,
      street: this.customer.street,
      buildingNumber: this.customer.buildingNumber
    }
  };

  this.service.updateCustomer(this.customerId, body)
    .subscribe({
      next: () => alert('Updated successfully'),
      error: (err) => alert(err.error?.title || 'Update failed')
    });
}

  // ================= IMAGE =================
  onFileChange(event: any) {
    this.selectedFile = event.target.files[0];
  }

  uploadImage() {
    if (!this.selectedFile) return;

    this.service.updateCustomerImage(this.customerId, this.selectedFile)
      .subscribe(() => {
        alert('Image updated');
        this.loadCustomer();
      });
  }

  deleteImage() {
    this.service.deleteCustomerImage(this.customerId)
      .subscribe(() => {
        alert('Image deleted');
        this.loadCustomer();
      });
  }

  // ================= DELETE =================
deleteCustomer() {
  if (!confirm('Are you sure you want to delete this customer?')) return;

  if (!this.deleteReason || this.deleteReason.trim() === '') {
    alert('Please enter a reason for deletion');
    return;
  }

  const body = {
    reason: this.deleteReason
  };

  this.service.deleteCustomer(this.customerId, body)
    .subscribe({
      next: () => history.back(),
      error: (err) => alert(err.error?.title || 'Delete failed')
    });
}

  loadOrders() {
    this.service.getCustomerOrders(this.customerId).subscribe((res: any) => {
      this.orders = res?.data || [];
    });
  }
}
