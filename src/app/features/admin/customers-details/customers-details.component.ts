import { ToastService } from '../../../core/services/toast.service';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AllCustomersForAdminService } from '../../../core/services/all-customers-for-admin.service';

@Component({
  selector: 'app-customers-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers-details.component.html',
  styleUrl: './customers-details.component.css'
})
export class CustomersDetailsComponent implements OnInit {

  customerId!: number;
  customer: any = {};
  shipments: any[] = [];
  shipmentsTotal = 0;
  deleteReason: string = '';
  selectedFile: File | null = null;

  constructor(
    private route: ActivatedRoute,
    private service: AllCustomersForAdminService,
    private toast: ToastService,
      private router: Router
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
        imageurl: c.imageurl || 'https://i.pravatar.cc/100',
        city: c.address?.city || '',
        state: c.address?.state || '',
        street: c.address?.street || '',
        buildingNumber: c.address?.buildingNumber || ''
      };
      this.loadShipments();
    });
  }

  // ================= UPDATE =================
  updateCustomer() {
    const body = {
      firstName: this.customer.firstName,
      lastName: this.customer.lastName,
      phoneNumber: this.customer.phoneNumber,
      email: this.customer.email,
      address: {
        city: this.customer.city,
        state: this.customer.state,
        street: this.customer.street,
        buildingNumber: this.customer.buildingNumber
      }
    };

    this.service.updateCustomer(this.customerId, body).subscribe({
      next: () => this.toast.success('Updated successfully'),
      error: (err) => this.toast.error(err.error?.title || 'Update failed')
    });
  }

  // ================= IMAGE =================
  onFileChange(event: any) {
    this.selectedFile = event.target.files[0];
  }

  uploadImage() {
    if (!this.selectedFile) return;
    this.service.updateCustomerImage(this.customerId, this.selectedFile).subscribe(() => {
      this.toast.success('Image updated successfully');
      this.loadCustomer();
    });
  }

  deleteImage() {
    this.service.deleteCustomerImage(this.customerId).subscribe(() => {
      this.toast.success('Image deleted');
      this.loadCustomer();
    });
  }

  // ================= DELETE =================
  deleteCustomer() {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    if (!this.deleteReason || this.deleteReason.trim() === '') {
      this.toast.warning('Please enter a reason for deletion');
      return;
    }

    this.service.deleteCustomer(this.customerId, { reason: this.deleteReason }).subscribe({
      next: () => history.back(),
      error: (err) => this.toast.error(err.error?.title || 'Delete failed')
    });
  }

  // ================= SHIPMENTS =================
  loadShipments() {
    this.service.getCustomerShipments(this.customerId).subscribe({
      next: (res: any) => {
        this.shipments = res?.data?.items || res?.data || res?.items || [];
        this.shipmentsTotal = res?.data?.totalCount || this.shipments.length;
      },
      error: () => {
        this.shipments = [];
        this.shipmentsTotal = 0;
      }
    });
  }

  // helper: badge class per shipment status
  getStatusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'delivered') return 'badge-paid';
    if (s === 'pending')   return 'badge-pending';
    if (s === 'cancelled' || s === 'canceled') return 'badge-rejected';
    return 'badge-indigo';
  }

goToShipmentItems(id: number) {
  this.router.navigate(['/admin/shipments', id, 'items']);
}
}
