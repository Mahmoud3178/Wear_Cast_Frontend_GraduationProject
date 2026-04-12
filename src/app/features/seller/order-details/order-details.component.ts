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
  subtotal = 0;
  shipping = 15;
  tax = 0;
  total = 0;

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
        recipientName: res.recipientName,
        items: res.items || [],
        totalAmount: res.totalAmount
      };

      this.items = res.items.map((item: any) => ({
        productName: item.productName,
        productImage: item.imageUrl,
        price: item.unitPrice,
        qty: item.quantity,
        total: item.totalPrice
      }));

      this.calculateTotals();
    });
  }

  calculateTotals() {
    this.subtotal = this.items.reduce((sum, i) => sum + i.total, 0);
    this.tax = this.subtotal * 0.14;
    this.total = this.subtotal + this.shipping + this.tax;
  }

  confirmOrder() {
    // ال API يريد "Ready" وليس رقم
    this.orderService.updateOrderStatus(this.orderId, { newStatus: "Ready" })
      .subscribe({
        next: () => {
          this.order.status = 'Ready';
        },
        error: err => {
          console.error('Error updating order status:', err);
        }
      });
  }
}
