import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import Chart from 'chart.js/auto';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('revenueChart') revenueChartRef!: ElementRef;
  @ViewChild('statusChart') statusChartRef!: ElementRef;

  private authService = inject(AuthService);

  isLoading = false;
  userName = 'Driver';
  today = new Date();

  stats = [
    { title: 'My Deliveries', value: '12', icon: 'bi-box-seam', trend: '+2', trendUp: true },
    { title: 'Hours Online', value: '45', icon: 'bi-clock', trend: '+5', trendUp: true },
    { title: 'Earnings', value: '$1,200', icon: 'bi-currency-dollar', trend: '+10%', trendUp: true },
    { title: 'Rating', value: '4.8', icon: 'bi-star-fill', trend: '+0.1', trendUp: true }
  ];

  recentShipments: any[] = [
    { id: 101, deliveryCity: 'Gaza', deliveryStreet: 'Al-Wehda St', shipmentStatus: 'Delivered', orderTime: new Date(), price: 50 },
    { id: 102, deliveryCity: 'Rafah', deliveryStreet: 'Main St', shipmentStatus: 'OutForDelivery', orderTime: new Date(), price: 30 },
    { id: 103, deliveryCity: 'Khan Younis', deliveryStreet: 'Al-Bahr St', shipmentStatus: 'Assigned', orderTime: new Date(), price: 40 }
  ];

  dashboardStats = {
    statusBreakdown: {
      'Pending': 2,
      'Assigned': 5,
      'Delivered': 12
    }
  };

  private chartInstance: any = null;
  private statusChartInstance: any = null;

  ngOnInit(): void {
    const profile = this.authService.getCustomerProfile();
    if (profile && profile.firstName) {
      this.userName = profile.firstName;
    }
  }

  ngAfterViewInit(): void {
    this.initCharts();
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
          label: 'Earnings',
          data: [200, 300, 250, 400, 350, 500],
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
                return `Earnings: $${value.toLocaleString()}`;
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
        labels: ['Pending', 'Assigned', 'Delivered'],
        datasets: [{
          data: [2, 5, 12],
          backgroundColor: ['#f59e0b', '#3b82f6', '#10b981'],
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

  getStatusName(status: string): string {
    switch (status) {
      case 'Pending': return 'Pending';
      case 'Assigned': return 'Assigned';
      case 'OutForDelivery': return 'Out for Delivery';
      case 'Delivered': return 'Delivered';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    if (status === 'Delivered') return 'status-success';
    if (status === 'Pending') return 'status-warning';
    if (status === 'OutForDelivery') return 'status-info';
    return 'status-info';
  }
}
