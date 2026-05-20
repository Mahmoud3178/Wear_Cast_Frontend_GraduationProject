import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ShipmentStatus } from '../../../core/models/shipment.model';
import { ShippingCompanyDashboardResponse, WalletResponse } from '../../../core/models/shipping-company.model';
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

  // --- Wallet & Ledger Info ---
  walletPage = 1;
  walletPageSize = 5;

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
}
