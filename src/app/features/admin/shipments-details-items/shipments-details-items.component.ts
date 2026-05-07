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

  fixedItems:    any[] = [];
  designedItems: any[] = [];
  allItems:      any[] = [];
  loading  = true;
  orderId!: number;

  constructor(
    private route:   ActivatedRoute,
    private service: HandelShipmentsForAdminService
  ) {}

  ngOnInit() {
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
        // ── Fixed items ──────────────────────────────────
        // API response: { items: [...] }  OR  direct array
        const fixed = res?.items ?? res?.fixedItems?.items ?? res?.fixedItems ?? [];

        // ── Designed items ───────────────────────────────
        const designed = res?.designedItems ?? res?.designedItems?.items ?? [];

        this.fixedItems    = Array.isArray(fixed)    ? fixed    : [];
        this.designedItems = Array.isArray(designed) ? designed : [];

        this.allItems = [
          ...this.fixedItems.map((x: any)    => ({ ...x, type: 'fixed' })),
          ...this.designedItems.map((x: any) => ({ ...x, type: 'designed' }))
        ];

        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }
}
