import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HandelShipmentsForAdminService } from '../../../core/services/handel-shipments-for-admin.service';

@Component({
  selector: 'app-shipments-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shipments-details.component.html',
  styleUrl: './shipments-details.component.css'
})
export class ShipmentsDetailsComponent implements OnInit {

  shipment: any;

  constructor(
    private route: ActivatedRoute,
    private service: HandelShipmentsForAdminService,
    private router: Router
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    this.load(id);
  }

  load(id: number) {
    this.service.getShipmentDetails(id).subscribe(res => {
      this.shipment = res;
    });
  }

  getStatusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'delivered')   return 'badge-paid';
    if (s === 'unassigned')  return 'badge-pending';
    if (s === 'cancelled' || s === 'canceled') return 'badge-rejected';
    return 'badge-indigo';
  }

  goToOrderItems(orderId: number) {
    this.router.navigate(['/admin/shipments', this.shipment.id, 'items'], {
      queryParams: { orderId }
    });
  }
}
