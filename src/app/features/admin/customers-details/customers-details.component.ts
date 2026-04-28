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

          // ✅ الصورة صح
          image: c.imageurl || 'https://i.pravatar.cc/100',

          // ✅ العنوان من object
          city: c.address?.city,
          state: c.address?.state,
          street: c.address?.street,
          buildingNumber: c.address?.buildingNumber
        };

        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }
}
