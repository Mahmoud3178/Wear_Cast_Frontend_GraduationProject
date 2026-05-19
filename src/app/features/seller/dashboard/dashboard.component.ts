import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import Chart from 'chart.js/auto';
import { DashboardSellerService } from '../../../core/services/dashboard-seller.service';
import { SallerOrderService } from '../../../core/services/saller-order.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements AfterViewInit, OnInit, OnDestroy {

  constructor(
    private dashService: DashboardSellerService,
    private orderService: SallerOrderService,
    private notifService: NotificationsService,
    private router: Router
  ) {}

  stats: any[] = [
    { title: 'Total Revenue',   value: '—', change: '', positive: true,  icon: 'bi-cash-coin',       iconBg: 'icon-green'  },
    { title: 'Total Orders',    value: '—', change: '', positive: true,  icon: 'bi-bag-check',       iconBg: 'icon-indigo' },
    { title: 'Pending Orders',  value: '—', change: '', positive: false, icon: 'bi-hourglass-split', iconBg: 'icon-yellow' },
    { title: 'Products',        value: '—', change: '', positive: true,  icon: 'bi-box-seam',        iconBg: 'icon-purple' },
    { title: 'Inventory Items', value: '—', change: '', positive: true,  icon: 'bi-archive',         iconBg: 'icon-cyan'   },
  ];

  products: any[] = [];
  orders:   any[] = [];
  undeliveredCount = 0;
  currentPage  = 1;
  itemsPerPage = 5;
  searchText   = '';
  isLoading    = true;

  statusSummary: { label: string; count: number; color: string }[] = [];

  private productsChart: Chart | null = null;
  private statusChart:   Chart | null = null;

  private readonly onNotifDelivered = () => { this.undeliveredCount = 0; };
  private readonly onNotifAllRead   = () => { this.undeliveredCount = 0; };
  private readonly onNotifRead      = () => { this.loadUndeliveredCount(); };

  ngOnInit() {
    this.loadDashboardStats();
    this.loadOrders();
    this.loadUndeliveredCount();

    window.addEventListener('notif-delivered', this.onNotifDelivered);
    window.addEventListener('notif-all-read',  this.onNotifAllRead);
    window.addEventListener('notif-read',      this.onNotifRead);

    this.router.events
      .pipe(filter((e: any) => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        if ((e.urlAfterRedirects || e.url).includes('/saller-notifications')) {
          setTimeout(() => this.loadUndeliveredCount(), 500);
        }
      });
  }

  ngOnDestroy() {
    window.removeEventListener('notif-delivered', this.onNotifDelivered);
    window.removeEventListener('notif-all-read',  this.onNotifAllRead);
    window.removeEventListener('notif-read',      this.onNotifRead);
  }

  ngAfterViewInit() {}

  loadUndeliveredCount() {
    this.notifService.getUndeliveredCount().subscribe({
      next: (res: any) => {
        this.undeliveredCount = this.notifService.parseUndeliveredCount(res);
      },
      error: () => {}
    });
  }

  loadDashboardStats() {
    this.dashService.getStats().subscribe({
      next: (res: any) => {
        const d = res?.data ?? res;
        this.stats = [
          { title: 'Total Revenue',   value: `${d.totalRevenue ?? 0} EGP`, change: '', positive: true,  icon: 'bi-cash-coin',       iconBg: 'icon-green'  },
          { title: 'Total Orders',    value: d.totalOrders ?? 0,           change: '', positive: true,  icon: 'bi-bag-check',       iconBg: 'icon-indigo' },
          { title: 'Pending Orders',  value: d.pendingOrders ?? 0,         change: '', positive: false, icon: 'bi-hourglass-split', iconBg: 'icon-yellow' },
          { title: 'Products',        value: d.uniqueProductsCount ?? 0,   change: '', positive: true,  icon: 'bi-box-seam',        iconBg: 'icon-purple' },
          { title: 'Inventory Items', value: d.totalInventoryItems ?? 0,   change: '', positive: true,  icon: 'bi-archive',         iconBg: 'icon-cyan'   },
        ];
        this.products = (d.topSellingProducts ?? []).map((p: any) => ({
          name:     p.name,
          category: p.targetAudience ?? '',
          sold:     p.totalSold ?? 0,
          image:    p.mainImageUrl ?? '',
          price:    p.price ?? 0,
        }));
        this.isLoading = false;
        setTimeout(() => { this.buildProductsChart(); this.buildStatusChart(); }, 0);
      },
      error: () => { this.isLoading = false; }
    });
  }

  loadOrders() {
    this.orderService.getSellerOrders(1, 100).subscribe({
      next: (res: any) => { this.orders = res?.items ?? res ?? []; this.buildStatusChart(); },
      error: () => { this.orders = []; }
    });
  }

  get filteredOrders() {
    const t = this.searchText.toLowerCase();
    return this.orders.filter(o =>
      o.id?.toString().includes(t) || (o.recipientName ?? '').toLowerCase().includes(t)
    );
  }

  get paginatedProducts() {
    const s = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredOrders.slice(s, s + this.itemsPerPage);
  }

  get totalPages() { return Math.max(1, Math.ceil(this.filteredOrders.length / this.itemsPerPage)); }
  get pages() { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }

  goToPage(p: number) { this.currentPage = p; }
  nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }
  prevPage() { if (this.currentPage > 1) this.currentPage--; }

  buildProductsChart() {
    const ctx = document.getElementById('productsChart') as HTMLCanvasElement;
    if (!ctx || !this.products.length) return;
    if (this.productsChart) { this.productsChart.destroy(); }
    const labels = this.products.map(p => p.name);
    const data   = this.products.map(p => p.sold);
    const colors = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b'];
    this.productsChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Units Sold', data, backgroundColor: colors.slice(0, data.length), borderRadius: 8, borderSkipped: false }] },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.y} units sold` } } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, color: '#94a3b8' }, grid: { color: '#f1f5f9' } },
          x: { ticks: { color: '#64748b', font: { size: 12 } }, grid: { display: false } }
        }
      }
    });
  }

  buildStatusChart() {
    const ctx = document.getElementById('statusChart') as HTMLCanvasElement;
    if (!ctx || !this.orders.length) return;
    if (this.statusChart) { this.statusChart.destroy(); }
    const statusColors: Record<string, string> = {
      'Paid': '#10b981', 'Ready': '#f59e0b', 'Pending': '#6366f1',
      'Shipped': '#06b6d4', 'Delivered': '#22c55e', 'Confirmed': '#8b5cf6', 'Cancelled': '#ef4444',
    };
    const counts: Record<string, number> = {};
    this.orders.forEach(o => { const s = o.status ?? 'Unknown'; counts[s] = (counts[s] ?? 0) + 1; });
    const labels = Object.keys(counts);
    const data   = Object.values(counts);
    const colors = labels.map(l => statusColors[l] ?? '#94a3b8');
    this.statusSummary = labels.map((l, i) => ({ label: l, count: data[i], color: colors[i] }));
    this.statusChart = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] },
      options: {
        responsive: true, cutout: '70%',
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed} orders` } } }
      }
    });
  }
}
