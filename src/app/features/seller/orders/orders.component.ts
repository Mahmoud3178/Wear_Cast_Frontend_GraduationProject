import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SallerOrderService } from '../../../core/services/saller-order.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css'
})
export class OrdersComponent implements OnInit {

  orders: any[] = [];
  selectedStatus = '';
  searchText = '';
  pageSize = 10;
  currentPage = 1;
  totalCount = 0;

  stats = [
    { title: 'Total Orders', value: 0,        icon: 'bi-cart',                  bg: 'bg-indigo' },
    { title: 'Pending',      value: 0,        icon: 'bi-truck',                  bg: 'bg-yellow' },
    { title: 'Returns',      value: 0,        icon: 'bi-arrow-counterclockwise', bg: 'bg-red'    },
    { title: 'Revenue',      value: '0 EGP',  icon: 'bi-cash-coin',              bg: 'bg-green'  },
  ];

  constructor(private orderService: SallerOrderService) {}

  ngOnInit() { this.loadOrders(); }

  loadOrders() {
    this.orderService.getSellerOrders(this.currentPage, this.pageSize)
      .subscribe((res: any) => {
        this.orders     = res.items   || [];
        this.totalCount = res.records || this.orders.length;
        this.calculateStats();
      });
  }

  calculateStats() {
    const revenue = this.orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    this.stats[0].value = this.totalCount;
    this.stats[1].value = this.orders.filter(o => o.status === 'Pending').length;
    this.stats[2].value = 0;
    this.stats[3].value = `${revenue.toLocaleString()} EGP`;
  }

  get filteredOrders() {
    const text = this.searchText.toLowerCase();
    return this.orders.filter(o =>
      (o.id?.toString().includes(text) ||
       (o.recipientName || '').toLowerCase().includes(text)) &&
      (this.selectedStatus === '' || o.status === this.selectedStatus)
    );
  }

  get totalPages(): number[] {
    return Array.from(
      { length: Math.ceil(this.totalCount / this.pageSize) },
      (_, i) => i + 1
    );
  }

  goToPage(page: number) { this.currentPage = page; this.loadOrders(); }

  nextPage() {
    if (this.currentPage < this.totalPages.length) { this.currentPage++; this.loadOrders(); }
  }

  prevPage() {
    if (this.currentPage > 1) { this.currentPage--; this.loadOrders(); }
  }
}
