import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SallerOrderService } from '../../../core/services/saller-order.service';

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-details.component.html',
})
export class OrderDetailsComponent implements OnInit {

  orderId!: number;
  order: any = {};
  items: any[] = [];
  designedItems: any[] = [];
  subtotal = 0;

  constructor(
    private route: ActivatedRoute,
    private orderService: SallerOrderService
  ) {}

  ngOnInit(): void {
    this.orderId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadOrderDetails();
  }

  loadOrderDetails() {
    this.orderService.getOrderItems(this.orderId).subscribe((res: any) => {
      this.order = {
        id: res.id,
        status: res.status,
        placedAt: res.createdOn,
        totalAmount: res.totalAmount,
        commission: res.commission,
        payout: res.payout,
        totalOrderItems: res.totalOrderItems,

        recipientName: res.recipientName,
        recipientPhone: res.recipientPhoneNumber,
        recipientExtraPhone: res.recipientAdditionalPhoneNumber,

        vendorName: res.vendorName,
        vendorPhone: res.vendorPhoneNumber,

        shippingAddress: res.shippingAddress,
        pickUpAddress: res.pickUpAddress,
      };

      this.items = (res.items || []).map((item: any) => ({
        productName: item.productName,
        productImage: item.imageUrl,
        colorName: item.colorName,
        orderItemType: item.orderItemType,
        price: item.unitPrice,
        qty: item.totalQuantity,
        total: item.totalPrice,
        sizes: item.sizes || [],
      }));

      this.designedItems = res.designedItems || [];

      this.subtotal = this.items.reduce((sum, i) => sum + i.total, 0);
    });
  }

  confirmOrder() {
    this.orderService.updateOrderStatus(this.orderId, { newStatus: 'Ready' })
      .subscribe({
        next: () => { this.order.status = 'Ready'; },
        error: err => { console.error('Error updating order status:', err); }
      });
  }
}
