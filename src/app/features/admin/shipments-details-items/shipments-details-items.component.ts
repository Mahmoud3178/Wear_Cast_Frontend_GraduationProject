import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HandelShipmentsForAdminService } from '../../../core/services/handel-shipments-for-admin.service';

@Component({
  selector: 'app-shipments-details-items',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shipments-details-items.component.html',
  styleUrl: './shipments-details-items.component.css'
})
export class ShipmentsDetailsItemsComponent implements OnInit {

  fixedItems: any[]    = [];
  designedItems: any[] = [];
  allItems: any[]      = [];
  loading = true;
  orderId!: number;

  constructor(
    private route: ActivatedRoute,
    private service: HandelShipmentsForAdminService
  ) {}

  ngOnInit() {
    // orderId بييجي من queryParam اللي بعتناه من shipments-details
    this.orderId = Number(this.route.snapshot.queryParams['orderId']);
    if (this.orderId) {
      this.load(this.orderId);
    } else {
      this.loading = false;
    }
  }

  load(orderId: number) {
    this.loading = true;
    this.service.getOrderItems(orderId).subscribe({
      next: (res: any) => {
        this.fixedItems    = res?.fixedItems?.items    || res?.fixedItems    || [];
        this.designedItems = res?.designedItems?.items || res?.designedItems || [];
        this.allItems = [
          ...this.fixedItems.map(x => ({ ...x, type: 'fixed' })),
          ...this.designedItems.map(x => ({ ...x, type: 'designed' }))
        ];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }
}
