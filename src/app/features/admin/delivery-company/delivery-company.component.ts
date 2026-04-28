import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShippingCompanyForAdminService } from '../../../core/services/shipping-company-for-admin.service';

@Component({
  selector: 'app-delivery-company',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delivery-company.component.html',
  styleUrl: './delivery-company.component.css'
})
export class DeliveryCompanyComponent {

  company: any;
  isLoading = false;

  constructor(private service: ShippingCompanyForAdminService) {}

  ngOnInit() {
    this.loadCompany();
  }

 loadCompany() {
    this.isLoading = true;

    this.service.getCompanyProfile(1).subscribe({
      next: (res: any) => {

        const c = res.data;

        this.company = {
          id: c.id,
          name: c.name,
          email: c.email,
          phoneNumber: c.phoneNumber,
          commercialRegisterNumber: c.commercialRegisterNumber,
          taxIdNumber: c.taxIdNumber,
          description: c.description,
          deliveryFee: c.deliveryFee,
          logo: c.logoUrl,

          state: c.address?.state,
          city: c.address?.city,
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
