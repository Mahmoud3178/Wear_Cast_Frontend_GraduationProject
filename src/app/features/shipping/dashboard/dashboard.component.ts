import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';
import { forkJoin } from 'rxjs';
import { ShippingService } from '../../../core/services/shipping.service';
import { DriverService } from '../../../core/services/driver.service';
import { AuthService } from '../../../core/services/auth.service';
import { ShipmentStatus } from '../../../core/models/shipment.model';
import { Driver } from '../../../core/models/driver.model';
import { ShippingCompanyDashboardResponse, WalletResponse, WalletTransaction } from '../../../core/models/shipping-company.model';
import { ShippingCompanyService } from '../../../core/services/shipping-company.service';

@Component({
  selector: 'app-shipping-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('statusChart') statusChartRef!: ElementRef;

  private driverService = inject(DriverService);
  private authService = inject(AuthService);
  private shippingCompanyService = inject(ShippingCompanyService);

  isLoading = true;
  userName = '';
  today = new Date();
  ShipmentStatusEnum = ShipmentStatus;

  dashboardStats: ShippingCompanyDashboardResponse | null = null;
  wallet: WalletResponse | null = null;

  stats = [
    { title: 'Pending Shipments', value: '0', icon: 'bi-clock-history', trend: 'Pending', trendUp: true },
    { title: 'Delivered Shipments', value: '0', icon: 'bi-check-circle', trend: 'Completed', trendUp: true },
    { title: 'Active Drivers', value: '0', icon: 'bi-truck', trend: 'Fleet Status', trendUp: true },
    { title: 'Wallet Balance', value: '$0', icon: 'bi-wallet2', trend: 'Current Balance', trendUp: true }
  ];

  walletPage = 1;
  walletPageSize = 5;

  // --- Shipping Company Order Requests Pipeline ---
  orderRequests: any[] = [];
  ordersCurrentPage = 1;
  ordersPageSize = 5;
  ordersTotalRecords = 0;
  ordersTotalPages = 1;
  isOrdersLoading = false;

  // Filters
  filterOrderStatus: number | 'All' = 'All';
  filterOrderType: number | 'All' = 'All';
  filterVendorCity = '';
  filterShipmentStatus: number | 'All' = 'All';
  filterSortBy = 1; // 1 = Newest

  constructor() { }

  ngOnInit(): void {
    // 1. Try to get from auth service first (cached in profile)
    const profile = this.authService.getCustomerProfile();
    if (profile && profile.firstName) {
      this.userName = profile.firstName;
    } else {
      // 2. Try to sync from token
      this.authService.syncCustomerProfileFromCurrentToken();
      const synced = this.authService.getCustomerProfile();
      if (synced && synced.firstName) {
        this.userName = synced.firstName;
      }
    }

    // 3. Fallback: Fetch from Shipping Manager profile endpoint for accurate name
    this.shippingCompanyService.getManager().subscribe({
      next: (manager) => {
        const rawManager = (manager as any)?.data ?? (manager as any)?.value ?? manager;
        if (rawManager) {
          this.userName = rawManager.firstName ?? rawManager.FirstName ?? this.userName;
        }
      },
      error: (err) => {
        console.warn('Could not fetch manager profile for dynamic name', err);
      }
    });

    this.loadData();
    this.loadOrders();
  }

  loadData() {
    this.isLoading = true;
    forkJoin({
      dashboard: this.shippingCompanyService.getDashboard(),
      wallet: this.shippingCompanyService.getWallet()
    }).subscribe({
      next: ({ dashboard, wallet }) => {
        // Handle standard API wrapper format or direct DTO
        const rawDashboard = (dashboard as any)?.data ?? (dashboard as any)?.value ?? dashboard ?? {};
        const rawWallet = (wallet as any)?.data ?? (wallet as any)?.value ?? wallet ?? {};

        // Case-tolerant DTO parsing for Dashboard
        this.dashboardStats = {
          pendingOrders: rawDashboard.pendingOrders ?? rawDashboard.PendingOrders ?? 0,
          pickedUpOrders: rawDashboard.pickedUpOrders ?? rawDashboard.PickedUpOrders ?? 0,
          pendingShipments: rawDashboard.pendingShipments ?? rawDashboard.PendingShipments ?? 0,
          unassignedShipments: rawDashboard.unassignedShipments ?? rawDashboard.UnassignedShipments ?? 0,
          assignedShipments: rawDashboard.assignedShipments ?? rawDashboard.AssignedShipments ?? 0,
          pickingUpShipments: rawDashboard.pickingUpShipments ?? rawDashboard.PickingUpShipments ?? 0,
          outForDeliveryShipments: rawDashboard.outForDeliveryShipments ?? rawDashboard.OutForDeliveryShipments ?? 0,
          deliveredShipments: rawDashboard.deliveredShipments ?? rawDashboard.DeliveredShipments ?? 0,
          totalDrivers: rawDashboard.totalDrivers ?? rawDashboard.TotalDrivers ?? 0,
          activeDrivers: rawDashboard.activeDrivers ?? rawDashboard.ActiveDrivers ?? 0,
          inactiveDrivers: rawDashboard.inactiveDrivers ?? rawDashboard.InactiveDrivers ?? 0,
          averageDeliveryTimeInHours: rawDashboard.averageDeliveryTimeInHours ?? rawDashboard.AverageDeliveryTimeInHours ?? 0,
          numberOfManagers: rawDashboard.numberOfManagers ?? rawDashboard.NumberOfManagers ?? 0
        };

        // Case-tolerant DTO parsing for Wallet and Transactions
        const rawTransactions = Array.isArray(rawWallet.recentTransactions ?? rawWallet.RecentTransactions)
          ? (rawWallet.recentTransactions ?? rawWallet.RecentTransactions)
          : [];

        const mappedTransactions = rawTransactions.map((t: any) => ({
          id: t.id ?? t.Id ?? 0,
          type: t.type ?? t.Type ?? '',
          amount: t.amount ?? t.Amount ?? 0,
          balanceAfter: t.balanceAfter ?? t.BalanceAfter ?? 0,
          description: t.description ?? t.Description ?? '',
          referenceOrderId: t.referenceOrderId ?? t.ReferenceOrderId ?? null,
          senderName: t.senderName ?? t.SenderName ?? null,
          senderEmail: t.senderEmail ?? t.SenderEmail ?? null,
          createdOn: t.createdOn ?? t.CreatedOn ?? ''
        }));

        this.wallet = {
          walletId: rawWallet.walletId ?? rawWallet.WalletId ?? 0,
          balance: rawWallet.balance ?? rawWallet.Balance ?? 0,
          recentTransactions: mappedTransactions
        };

        // Update stats array for UI
        this.stats[0].value = (this.dashboardStats.pendingShipments).toLocaleString();
        this.stats[0].trend = `${this.dashboardStats.unassignedShipments} Unassigned`;
        this.stats[0].trendUp = (this.dashboardStats.unassignedShipments) === 0;

        this.stats[1].value = (this.dashboardStats.deliveredShipments).toLocaleString();
        this.stats[1].trend = 'Completed';
        this.stats[1].trendUp = true;

        this.stats[2].value = `${this.dashboardStats.activeDrivers} / ${this.dashboardStats.totalDrivers}`;
        this.stats[2].trend = `${this.dashboardStats.inactiveDrivers} Inactive`;
        this.stats[2].trendUp = (this.dashboardStats.activeDrivers) > 0;

        this.stats[3].value = '$' + (this.wallet.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        this.stats[3].trend = 'Gross Earnings';
        this.stats[3].trendUp = (this.wallet.balance) >= 0;

        this.isLoading = false;

        // Update status chart with real-time backend data
        this.updateStatusChart(this.dashboardStats);
      },
      error: (err) => {
        console.error('Failed to load dashboard data', err);
        this.isLoading = false;
      }
    });
  }

  get walletPagedTransactions() {
    if (!this.wallet?.recentTransactions) return [];
    const start = (this.walletPage - 1) * this.walletPageSize;
    return this.wallet.recentTransactions.slice(start, start + this.walletPageSize);
  }

  get walletTotalPages(): number {
    if (!this.wallet?.recentTransactions) return 1;
    return Math.max(1, Math.ceil(this.wallet.recentTransactions.length / this.walletPageSize));
  }

  walletGoTo(page: number) {
    if (page >= 1 && page <= this.walletTotalPages) this.walletPage = page;
  }

  updateStatusChart(dashboard: ShippingCompanyDashboardResponse) {
    if (!this.statusChartInstance) return;

    const labels = ['Pending', 'Unassigned', 'Assigned', 'Picking Up', 'Out For Delivery', 'Delivered'];
    const data = [
      dashboard.pendingShipments,
      dashboard.unassignedShipments,
      dashboard.assignedShipments,
      dashboard.pickingUpShipments,
      dashboard.outForDeliveryShipments,
      dashboard.deliveredShipments
    ];

    this.statusChartInstance.data.labels = labels;
    this.statusChartInstance.data.datasets[0].data = data;
    this.statusChartInstance.data.datasets[0].backgroundColor = [
      '#f59e0b', // Pending (amber)
      '#ef4444', // Unassigned (red)
      '#3b82f6', // Assigned (blue)
      '#6366f1', // PickingUp (indigo)
      '#8b5cf6', // OutForDelivery (purple)
      '#10b981'  // Delivered (emerald)
    ];
    this.statusChartInstance.update();
  }

  private statusChartInstance: any = null;

  ngAfterViewInit(): void {
    this.initCharts();
  }

  initCharts() {
    this.initStatusChart();
  }

  initStatusChart() {
    this.statusChartInstance = new Chart(this.statusChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Pending', 'Assigned', 'Delivered', 'Other'],
        datasets: [{
          data: [0, 0, 0, 0],
          backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#64748b'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: { size: 12 }
            }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            padding: 12,
            displayColors: true
          }
        }
      }
    });
  }

  getStatusName(status: any): string {
    const s = typeof status === 'string' ? ShipmentStatus[status as keyof typeof ShipmentStatus] : status;

    switch (s) {
      case ShipmentStatus.Pending: return 'Pending';
      case ShipmentStatus.Unassigned: return 'Unassigned';
      case ShipmentStatus.Assigned: return 'Assigned';
      case ShipmentStatus.PickingUp: return 'Picking Up';
      case ShipmentStatus.OutForDelivery: return 'Out for Delivery';
      case ShipmentStatus.Delivered: return 'Delivered';
      default: return 'Processing';
    }
  }

  getStatusClass(status: any): string {
    const s = typeof status === 'string' ? ShipmentStatus[status as keyof typeof ShipmentStatus] : status;

    if (s === ShipmentStatus.Delivered) return 'status-success';
    if (s === ShipmentStatus.Pending) return 'status-warning';
    if (s === ShipmentStatus.Unassigned) return 'status-danger';
    return 'status-info';
  }

  // --- Shipping Company Order Requests Pipeline ---
  loadOrders() {
    this.isOrdersLoading = true;
    const params: any = {
      PageIndex: this.ordersCurrentPage,
      PageSize: this.ordersPageSize,
      SortBy: this.filterSortBy
    };

    if (this.filterOrderStatus !== 'All') {
      params.OrderStatus = this.filterOrderStatus;
    }
    if (this.filterOrderType !== 'All') {
      params.OrderType = this.filterOrderType;
    }
    if (this.filterVendorCity.trim()) {
      params.VendorCity = this.filterVendorCity.trim();
    }
    if (this.filterShipmentStatus !== 'All') {
      params.ShipmentStatus = this.filterShipmentStatus;
    }

    this.shippingCompanyService.getOrders(params).subscribe({
      next: (res) => {
        const raw = (res as any)?.data ?? (res as any)?.value ?? res ?? {};
        this.orderRequests = raw.items ?? [];
        this.ordersTotalRecords = raw.records ?? 0;
        this.ordersTotalPages = raw.pages ?? 1;
        this.isOrdersLoading = false;
      },
      error: (err) => {
        console.error('Failed to load orders requests', err);
        this.isOrdersLoading = false;
      }
    });
  }

  ordersNextPage() {
    if (this.ordersCurrentPage < this.ordersTotalPages) {
      this.ordersCurrentPage++;
      this.loadOrders();
    }
  }

  ordersPreviousPage() {
    if (this.ordersCurrentPage > 1) {
      this.ordersCurrentPage--;
      this.loadOrders();
    }
  }

  ordersGoToPage(page: number) {
    if (page >= 1 && page <= this.ordersTotalPages) {
      this.ordersCurrentPage = page;
      this.loadOrders();
    }
  }

  applyFilters() {
    this.ordersCurrentPage = 1;
    this.loadOrders();
  }

  resetFilters() {
    this.filterOrderStatus = 'All';
    this.filterOrderType = 'All';
    this.filterVendorCity = '';
    this.filterShipmentStatus = 'All';
    this.filterSortBy = 1;
    this.ordersCurrentPage = 1;
    this.loadOrders();
  }

  getOrderStatusName(status: any): string {
    if (status === null || status === undefined) return 'Pending';
    // Handle both number and string conversions
    let s = Number(status);
    if (isNaN(s)) return status.toString();

    switch (s) {
      case 0: return 'Pending';
      case 1: return 'Paid';
      case 2: return 'Failed';
      case 3: return 'Cancelled';
      case 4: return 'Refunded';
      case 5: return 'Ready';
      case 6: return 'PickedUp';
      default: return 'Processing';
    }
  }

  getOrderStatusClass(status: any): string {
    if (status === null || status === undefined) return 'status-warning';
    let s = Number(status);
    if (isNaN(s)) {
      if (status === 'Paid' || status === 'PickedUp' || status === 'Ready') return 'status-success';
      if (status === 'Cancelled' || status === 'Failed') return 'status-danger';
      return 'status-warning';
    }

    switch (s) {
      case 1: // Paid
      case 5: // Ready
      case 6: // PickedUp
        return 'status-success';
      case 2: // Failed
      case 3: // Cancelled
        return 'status-danger';
      default:
        return 'status-warning';
    }
  }

  getOrderTypeName(type: any): string {
    if (type === null || type === undefined) return 'Standard';
    let t = Number(type);
    if (isNaN(t)) return type.toString();

    switch (t) {
      case 1: return 'Fixed Product';
      case 2: return 'Custom Design';
      default: return 'Standard';
    }
  }

  getOrderTypeClass(type: any): string {
    if (type === null || type === undefined) return 'badge-secondary';
    let t = Number(type);
    if (isNaN(t)) {
      return type === 'Fixed' || type === 'FixedProduct' ? 'badge-fixed-product' : 'badge-custom-design';
    }

    switch (t) {
      case 1: return 'badge-fixed-product';
      case 2: return 'badge-custom-design';
      default: return 'badge-secondary';
    }
  }
}
