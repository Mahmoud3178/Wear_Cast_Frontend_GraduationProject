import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css'
})
export class OrdersComponent implements OnInit {

  orders: any[] = [];
  selectedOrder: any = null;
allOrders: any[] = [];
searchTerm: string = '';
  selectedStatus: string | null = null;

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadOrders();
  }

setStatus(status: string | null) {
  this.selectedStatus = status;

  if (!status) {
    this.orders = [...this.allOrders];
    return;
  }

  this.orders = this.allOrders.filter(o => o.status === status);
}
applyFilters() {
  this.orders = this.allOrders.filter(o => {

    const matchStatus =
      !this.selectedStatus || o.status === this.selectedStatus;

    const matchSearch =
      !this.searchTerm ||
      o.id.toString().includes(this.searchTerm) ||
      o.recipientName?.toLowerCase().includes(this.searchTerm.toLowerCase());

    return matchStatus && matchSearch;
  });
}
onSearch() {
  this.applyFilters();
}
loadOrders() {
  this.adminService.getAllOrders().subscribe({
    next: (res: any) => {

      const data = res?.data || res?.items || res || [];

      this.allOrders = data.map((o: any) =>
        this.adminService.mapOrder(o)
      );
   this.applyFilters(); // 🔥 مهم
      this.orders = [...this.allOrders]; // initial view
    },

    error: (err) => {
      console.error(err);
    }
  });
}

  openDetails(order: any) {
    this.selectedOrder = { ...order, items: [] };

    this.adminService.getOrderItems(order.id).subscribe({
      next: (res: any) => {
        this.selectedOrder.items = res?.data || res?.items || res || [];
      },
      error: (err) => {
        console.error('Error loading items', err);
      }
    });
  }

  updateOrder() {
    if (!this.selectedOrder) return;

    const statusValue = this.selectedOrder.status;

    this.adminService.updateOrderStatus(this.selectedOrder.id, statusValue)
      .subscribe({
        next: () => {
          console.log('Order updated');
          this.loadOrders();
        },
        error: (err) => console.error(err)
      });
  }
}
