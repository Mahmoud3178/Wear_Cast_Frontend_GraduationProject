import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AllCustomersForAdminService } from '../../../core/services/all-customers-for-admin.service';

@Component({
  selector: 'app-customer-details-items',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customer-details-items.component.html',
  styleUrl: './customer-details-items.component.css'
})
export class CustomerDetailsItemsComponent implements OnInit {

  shipmentId!: number;
  fixedItems:    any[] = [];
  designedItems: any[] = [];
  loading = true;

  constructor(
    private route:   ActivatedRoute,
    private service: AllCustomersForAdminService,
  ) {}

  ngOnInit() {
    this.shipmentId = +this.route.snapshot.paramMap.get('shipmentId')!;
    this.loadItems();
  }

  loadItems() {
    this.loading = true;
    this.service.getShipmentItems(this.shipmentId).subscribe({
      next: (res: any) => {
        // Response: { fixedItems: { items: [...], pageIndex, pageSize, records, pages },
        //             designedItems: { items: [...], ... } }
        this.fixedItems    = res?.fixedItems?.items    ?? [];
        this.designedItems = res?.designedItems?.items ?? [];
        this.loading = false;
      },
      error: () => {
        this.fixedItems    = [];
        this.designedItems = [];
        this.loading = false;
      }
    });
  }
}
