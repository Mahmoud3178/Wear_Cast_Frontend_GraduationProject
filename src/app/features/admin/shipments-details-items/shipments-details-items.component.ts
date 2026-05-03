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

  fixedItems: any[] = [];
  designedItems: any[] = [];
  allItems: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private service: HandelShipmentsForAdminService
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.params['id']);
    this.load(id);
  }

  load(id: number) {
    this.service.getShipmentItems(id).subscribe((res: any) => {

      this.fixedItems = res?.fixedItems?.items || [];
      this.designedItems = res?.designedItems?.items || [];

      // دمج مع تمييز النوع
      this.allItems = [
        ...this.fixedItems.map(x => ({ ...x, type: 'fixed' })),
        ...this.designedItems.map(x => ({ ...x, type: 'designed' }))
      ];

      console.log('ALL ITEMS 👉', this.allItems);
    });
  }
}
