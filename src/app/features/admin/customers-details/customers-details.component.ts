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
  customer: any;
  orders: any[] = [];
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private customerService: AllCustomersForAdminService
  ) {}

  ngOnInit() {
    this.customerId = +this.route.snapshot.paramMap.get('id')!;
    this.loadCustomer();
  }

  loadCustomer() {
    this.isLoading = true;

    this.customerService.getCustomerById(this.customerId).subscribe({
      next: (res: any) => {

        const c = res.data;

        this.customer = {
          id: c.id,
          name: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim(),
          phoneNumber: c.phoneNumber,

          // ✅ FIX IMAGE
          image: c.imageUrl || c.imageurl || 'https://i.pravatar.cc/100',

          city: c.address?.city || '',
          state: c.address?.state || '',
          street: c.address?.street || '',
          buildingNumber: c.address?.buildingNumber || ''
        };

        this.loadOrders();

        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  loadOrders() {
    this.customerService.getCustomerOrders(this.customerId).subscribe({
      next: (res: any) => {
        this.orders = res.data || [];
      },
      error: () => {
        this.orders = [];
      }
    });
  }

  deleteCustomer() {
    if (!confirm('Delete customer?')) return;

    this.customerService.deleteCustomer(this.customerId).subscribe({
      next: () => history.back()
    });
  }
}
