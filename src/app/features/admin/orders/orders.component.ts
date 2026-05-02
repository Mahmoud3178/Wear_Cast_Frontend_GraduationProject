import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  allOrders: any[] = [];
  searchTerm: string = '';
  selectedStatus: string | null = null;

  constructor(
    private adminService: AdminService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadOrders();
  }

loadOrders() {
  this.adminService.getAllOrders().subscribe({
    next: (res: any) => {

      const data = res?.items || [];

      this.allOrders = data.map((o: any) =>
        this.adminService.mapOrder(o)
      );

      this.applyFilters();
      this.orders = [...this.allOrders];
    },
    error: (err) => console.error(err)
  });
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

  setStatus(status: string | null) {
    this.selectedStatus = status;
    this.applyFilters();
  }

  openDetails(orderId: number) {
    this.router.navigate(['/admin/orders', orderId]);
  }
}
