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
  filteredOrders: any[] = [];
  allOrders: any[] = [];

  searchTerm: string = '';
  selectedStatus: string | null = null;

  // 🔥 Pagination
  pageSize = 5;
  currentPage = 1;
  totalPages = 1;

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
      },
      error: (err) => console.error(err)
    });
  }

  // ================= FILTER =================
  applyFilters() {

    this.filteredOrders = this.allOrders.filter(o => {

      const matchStatus =
        !this.selectedStatus || o.status === this.selectedStatus;

      const matchSearch =
        !this.searchTerm ||
        o.id.toString().includes(this.searchTerm) ||
        o.recipientName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        o.vendorName?.toLowerCase().includes(this.searchTerm.toLowerCase());

      return matchStatus && matchSearch;
    });

    this.totalPages = Math.ceil(this.filteredOrders.length / this.pageSize);

    this.currentPage = 1;
    this.updatePage();
  }

  // ================= PAGINATION =================
  updatePage() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;

    this.orders = this.filteredOrders.slice(start, end);
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;

    this.currentPage = page;
    this.updatePage(); // ✅ مش applyFilters
  }

  // ================= UI =================
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
