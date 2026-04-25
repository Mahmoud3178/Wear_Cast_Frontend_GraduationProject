import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import Chart from 'chart.js/auto';
import { forkJoin } from 'rxjs';
import { ShippingService } from '../../../core/services/shipping.service';
import { DriverService } from '../../../core/services/driver.service';
import { Shipment, ShipmentStatus } from '../../../core/models/shipment.model';
import { Driver } from '../../../core/models/driver.model';
import { ShippingDashboardStats } from '../../../core/models/dashboard.model';

@Component({
  selector: 'app-shipping-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('revenueChart') revenueChartRef!: ElementRef;

  private shippingService = inject(ShippingService);
  private driverService = inject(DriverService);

  isLoading = true;
  ShipmentStatusEnum = ShipmentStatus;

  dashboardStats: ShippingDashboardStats = {
    totalShipments: 0,
    activeDrivers: 0,
    totalRevenue: 0,
    pendingDeliveries: 0
  };

  stats = [
    { title: 'Total Shipments', value: '0', icon: 'bi-box-seam', trend: '+0%', trendUp: true },
    { title: 'Active Drivers', value: '0', icon: 'bi-truck', trend: '+0%', trendUp: true },
    { title: 'Revenue', value: '$0', icon: 'bi-currency-dollar', trend: '+0%', trendUp: true },
    { title: 'Pending Deliveries', value: '0', icon: 'bi-clock-history', trend: '-0%', trendUp: false }
  ];

  recentShipments: Shipment[] = [];

  constructor() { }

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    forkJoin({
      shipments: this.shippingService.getAllShipments(),
      drivers: this.driverService.getAllDrivers()
    }).subscribe({
      next: ({ shipments, drivers }) => {
        this.dashboardStats = this.shippingService.getDashboardStats(shipments, drivers);
        
        // Update stats array for UI
        this.stats[0].value = this.dashboardStats.totalShipments.toString();
        this.stats[1].value = this.dashboardStats.activeDrivers.toString();
        this.stats[2].value = '$' + this.dashboardStats.totalRevenue.toLocaleString();
        this.stats[3].value = this.dashboardStats.pendingDeliveries.toString();

        this.recentShipments = this.shippingService.getRecentShipments(shipments, 4);
        
        this.isLoading = false;
        // In a real scenario, we might also update the chart with real revenue data over time here.
        this.updateChartData(shipments);
      },
      error: (err) => {
        console.error('Failed to load dashboard data', err);
        this.isLoading = false;
      }
    });
  }

  private chartInstance: any = null;

  ngAfterViewInit(): void {
    this.initChart();
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

  initChart() {
    this.chartInstance = new Chart(this.revenueChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Revenue ($)',
          data: [0, 0, 0, 0, 0, 0],
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              display: true,
              color: 'rgba(0,0,0,0.05)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }
}
