import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import Chart from 'chart.js/auto';
import { forkJoin } from 'rxjs';
import { ShippingService } from '../../../core/services/shipping.service';
import { DriverService } from '../../../core/services/driver.service';
import { AuthService } from '../../../core/services/auth.service';
import { Shipment, ShipmentStatus } from '../../../core/models/shipment.model';
import { Driver } from '../../../core/models/driver.model';
import { ShippingDashboardStats } from '../../../core/models/dashboard.model';
import { ShippingCompanyService } from '../../../core/services/shipping-company.service';

@Component({
  selector: 'app-shipping-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('revenueChart') revenueChartRef!: ElementRef;
  @ViewChild('statusChart') statusChartRef!: ElementRef;

  private shippingService = inject(ShippingService);
  private driverService = inject(DriverService);
  private authService = inject(AuthService);
  private shippingCompanyService = inject(ShippingCompanyService);

  isLoading = true;
  userName = '';
  today = new Date();
  ShipmentStatusEnum = ShipmentStatus;

  dashboardStats: ShippingDashboardStats = {
    totalShipments: 0,
    activeDrivers: 0,
    totalRevenue: 0,
    pendingDeliveries: 0,
    totalShipmentsGrowth: 0,
    activeDriversGrowth: 0,
    totalRevenueGrowth: 0,
    pendingDeliveriesGrowth: 0,
    monthlyRevenue: [],
    statusBreakdown: {}
  };

  stats = [
    { title: 'Total Shipments', value: '0', icon: 'bi-box-seam', trend: '0%', trendUp: true },
    { title: 'Active Drivers', value: '0', icon: 'bi-truck', trend: '0%', trendUp: true },
    { title: 'Gross Revenue', value: '$0', icon: 'bi-currency-dollar', trend: '0%', trendUp: true },
    { title: 'Pending Deliveries', value: '0', icon: 'bi-clock-history', trend: '0%', trendUp: false }
  ];

  recentShipments: Shipment[] = [];

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
        if (manager && manager.firstName) {
          this.userName = manager.firstName;
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
      stats: this.shippingService.getShippingStats(),
      shipments: this.shippingService.getAllShipments()
    }).subscribe({
      next: ({ stats, shipments }) => {
        this.dashboardStats = stats;
        
        // Update stats array for UI
        this.stats[0].value = this.dashboardStats.totalShipments.toLocaleString();
        this.stats[0].trend = (this.dashboardStats.totalShipmentsGrowth >= 0 ? '+' : '') + this.dashboardStats.totalShipmentsGrowth + '%';
        this.stats[0].trendUp = this.dashboardStats.totalShipmentsGrowth >= 0;

        this.stats[1].value = this.dashboardStats.activeDrivers.toLocaleString();
        this.stats[1].trend = (this.dashboardStats.activeDriversGrowth >= 0 ? '+' : '') + this.dashboardStats.activeDriversGrowth + '%';
        this.stats[1].trendUp = this.dashboardStats.activeDriversGrowth >= 0;

        this.stats[2].value = '$' + this.dashboardStats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        this.stats[2].trend = (this.dashboardStats.totalRevenueGrowth >= 0 ? '+' : '') + this.dashboardStats.totalRevenueGrowth + '%';
        this.stats[2].trendUp = this.dashboardStats.totalRevenueGrowth >= 0;

        this.stats[3].value = this.dashboardStats.pendingDeliveries.toLocaleString();
        this.stats[3].trend = (this.dashboardStats.pendingDeliveriesGrowth >= 0 ? '+' : '') + this.dashboardStats.pendingDeliveriesGrowth + '%';
        this.stats[3].trendUp = this.dashboardStats.pendingDeliveriesGrowth <= 0; // Fewer pending is usually good

        this.recentShipments = this.shippingService.getRecentShipments(shipments, 4);
        
        this.isLoading = false;
        
        // Update revenue chart with backend data
        if (this.chartInstance && this.dashboardStats.monthlyRevenue) {
          this.chartInstance.data.labels = this.dashboardStats.monthlyRevenue.map(m => m.month);
          this.chartInstance.data.datasets[0].data = this.dashboardStats.monthlyRevenue.map(m => m.revenue);
          this.chartInstance.update();
        }

        // Update status chart with backend data
        if (this.statusChartInstance && this.dashboardStats.statusBreakdown) {
          const labels = Object.keys(this.dashboardStats.statusBreakdown);
          const data = Object.values(this.dashboardStats.statusBreakdown);
          this.statusChartInstance.data.labels = labels;
          this.statusChartInstance.data.datasets[0].data = data;
          this.statusChartInstance.update();
        }
      },
      error: (err) => {
        console.error('Failed to load dashboard data', err);
        this.isLoading = false;
      }
    });
  }

  private chartInstance: any = null;
  private statusChartInstance: any = null;

  ngAfterViewInit(): void {
    this.initCharts();
  }

  updateChartData(shipments: Shipment[]) {
    if (!this.chartInstance) return;

    // Calculate revenue for the last 6 months
    const last6Months = [];
    const monthlyRevenue = new Array(6).fill(0);
    const currentDate = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      last6Months.push(d.toLocaleString('default', { month: 'short' }));
    }

    shipments.forEach(s => {
      if (s.orderTime && s.price) {
        const orderDate = new Date(s.orderTime);
        const diffMonths = (currentDate.getFullYear() - orderDate.getFullYear()) * 12 + (currentDate.getMonth() - orderDate.getMonth());
        
        if (diffMonths >= 0 && diffMonths < 6) {
          const index = 5 - diffMonths;
          monthlyRevenue[index] += s.price;
        }
      }
    });

    this.chartInstance.data.labels = last6Months;
    this.chartInstance.data.datasets[0].data = monthlyRevenue;
    this.chartInstance.update();
  }

  initCharts() {
    this.initRevenueChart();
    this.initStatusChart();
  }

  initRevenueChart() {
    this.chartInstance = new Chart(this.revenueChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Revenue',
          data: [0, 0, 0, 0, 0, 0],
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#2563eb',
          pointBorderColor: '#fff',
          pointHoverRadius: 6,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            padding: 12,
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
            displayColors: false,
            callbacks: {
              label: (context: any) => {
                const value = context.parsed.y !== null && context.parsed.y !== undefined ? context.parsed.y : 0;
                return `Revenue: $${value.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            border: { display: false },
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              callback: (value) => '$' + value
            }
          },
          x: {
            border: { display: false },
            grid: { display: false }
          }
        }
      }
    });
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
