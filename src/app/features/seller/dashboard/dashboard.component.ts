import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import Chart from 'chart.js/auto';
import { DashboardSellerService } from '../../../core/services/dashboard-seller.service';
import { SallerOrderService } from '../../../core/services/saller-order.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements AfterViewInit, OnInit {

  constructor(
    private dashService: DashboardSellerService,
    private orderService: SallerOrderService
  ) {}

  stats = [
    { title: 'Total Revenue',    value: '—', change: '', positive: true  },
    { title: 'Total Orders',     value: '—', change: '', positive: true  },
    { title: 'Pending Orders',   value: '—', change: '', positive: false },
    { title: 'Products',         value: '—', change: '', positive: true  },
    { title: 'Inventory Items',  value: '—', change: '', positive: true  },
  ];

  // top selling products from API
  products: any[] = [];

  // orders table
  orders: any[] = [];
  currentPage  = 1;
  itemsPerPage = 5;
  searchText   = '';

  isLoading = true;

  // ── Init ──────────────────────────────────────────────
  ngOnInit() {
    this.loadDashboardStats();
    this.loadOrders();
  }

  // ── Dashboard stats + top products ───────────────────
  loadDashboardStats() {
    this.dashService.getStats().subscribe({
      next: (res: any) => {
        const d = res?.data ?? res;

        this.stats = [
          { title: 'Total Revenue',   value: `${d.totalRevenue ?? 0} EGP`, change: '', positive: true  },
          { title: 'Total Orders',    value: d.totalOrders       ?? 0,     change: '', positive: true  },
          { title: 'Pending Orders',  value: d.pendingOrders     ?? 0,     change: '', positive: false },
          { title: 'Products',        value: d.uniqueProductsCount ?? 0,   change: '', positive: true  },
          { title: 'Inventory Items', value: d.totalInventoryItems ?? 0,   change: '', positive: true  },
        ];

        // top selling products
        this.products = (d.topSellingProducts ?? []).map((p: any) => ({
          name:      p.name,
          category:  p.targetAudience ?? '',
          sold:      p.totalSold ?? 0,
          image:     p.mainImageUrl ?? p.imageUrl ?? '',
          price:     p.price ?? 0,
          inStock:   p.isRejected === false
        }));

        this.isLoading = false;
        this.rebuildChart();
      },
      error: () => { this.isLoading = false; }
    });
  }

  // ── Orders table ──────────────────────────────────────
  loadOrders() {
    this.orderService.getSellerOrders(1, 100).subscribe({
      next: (res: any) => {
        this.orders = res?.items ?? res ?? [];
      },
      error: () => { this.orders = []; }
    });
  }

  get filteredOrders() {
    const t = this.searchText.toLowerCase();
    return this.orders.filter(o =>
      o.id?.toString().includes(t) ||
      (o.recipientName ?? o.customerName ?? '').toLowerCase().includes(t)
    );
  }

  get paginatedProducts() {
    const s = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredOrders.slice(s, s + this.itemsPerPage);
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.filteredOrders.length / this.itemsPerPage));
  }

  get pages() {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(p: number) { this.currentPage = p; }
  nextPage()  { if (this.currentPage < this.totalPages) this.currentPage++; }
  prevPage()  { if (this.currentPage > 1) this.currentPage--; }

  // ── Chart ─────────────────────────────────────────────
  private chart: Chart | null = null;

  rebuildChart() {
    const ctx = document.getElementById('revenueChart') as HTMLCanvasElement;
    if (!ctx) return;
    if (this.chart) { this.chart.destroy(); this.chart = null; }

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Revenue (EGP)',
          data: [1200, 1900, 3000, 2500, 3200, 4100],
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.08)',
          borderWidth: 2,
          pointBackgroundColor: '#6366f1',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8' } },
          x: { grid: { display: false },   ticks: { color: '#94a3b8' } }
        }
      }
    });
  }

  ngAfterViewInit() {
    // chart يتبني بعد ما الـ stats ترجع من الـ API
    // rebuildChart بتتستدعى في loadDashboardStats
  }
}
