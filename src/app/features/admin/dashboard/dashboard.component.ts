import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { FormsModule } from '@angular/forms';
import { HandelDashboardService } from '../../../core/services/handel-dashboard.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  data: any;
  stats: any[] = [];
  commission = 0;
  loadingCommission = false;

  constructor(
    private service: HandelDashboardService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadDashboard();
    this.loadCommission();
  }

  loadDashboard() {
    this.service.getDashboard().subscribe((res: any) => {

      this.data = res.data;

      this.stats = [
        {
          title: 'Money Processed',
          value: (this.data.totalMoneyProcessed || 0).toLocaleString() + ' EGP',
          icon: 'bi-cash-coin',
          color: '#10b981',
          bg: 'rgba(16,185,129,0.1)'
        },
        {
          title: 'Order Items',
          value: this.data.totalOrderItems ?? 0,
          icon: 'bi-box-seam',
          color: '#6366f1',
          bg: 'rgba(99,102,241,0.1)'
        },
        {
          title: 'Shipments',
          value: this.data.totalShipments ?? 0,
          icon: 'bi-truck',
          color: '#f59e0b',
          bg: 'rgba(245,158,11,0.1)'
        },
        {
          title: 'Customers',
          value: this.data.totalCustomers ?? 0,
          icon: 'bi-people-fill',
          color: '#3b82f6',
          bg: 'rgba(59,130,246,0.1)'
        },
        {
          title: 'Sellers',
          value: this.data.totalSellers ?? 0,
          icon: 'bi-shop',
          color: '#8b5cf6',
          bg: 'rgba(139,92,246,0.1)'
        },
        {
          title: 'Products',
          value: this.data.totalProducts ?? 0,
          icon: 'bi-bag',
          color: '#64748b',
          bg: 'rgba(100,116,139,0.1)'
        },
        {
          title: 'Seller Orders',
          value: this.data.totalSellerOrders ?? 0,
          icon: 'bi-receipt',
          color: '#10b981',
          bg: 'rgba(16,185,129,0.1)'
        },
        {
          title: 'Factory Orders',
          value: this.data.totalFactoryOrders ?? 0,
          icon: 'bi-building',
          color: '#ef4444',
          bg: 'rgba(239,68,68,0.1)'
        },
      ];

      // 🔥 مهم جدا
      this.cdr.detectChanges();

      // 🔥 ارسم بعد ما DOM يجهز
      setTimeout(() => {
        this.createCharts();
      }, 0);

    });
  }

  loadCommission() {
    this.service.getCommission().subscribe((res: any) => {
      this.commission =
        res?.data?.commissionPercentage ??
        res?.commissionPercentage ??
        0;
    });
  }

  saveCommission() {
    this.loadingCommission = true;
    this.service.updateCommission(this.commission).subscribe({
      next: () => {
        this.loadingCommission = false;
        this.toast.success('Commission updated successfully ✓');
      },
      error: () => {
        this.loadingCommission = false;
        this.toast.error('Failed to update commission.');
      }
    });
  }

  createCharts() {

    const lineCanvas = document.getElementById('lineChart') as HTMLCanvasElement;
    const barCanvas = document.getElementById('barChart') as HTMLCanvasElement;

    if (!lineCanvas || !barCanvas) {
      console.log('Canvas not ready yet');
      return;
    }

    const existing1 = Chart.getChart(lineCanvas);
    if (existing1) existing1.destroy();

    const existing2 = Chart.getChart(barCanvas);
    if (existing2) existing2.destroy();

    // 🔥 Doughnut
    new Chart(lineCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Seller Orders', 'Factory Orders'],
        datasets: [{
          data: [
            this.data.totalSellerOrders ?? 0,
            this.data.totalFactoryOrders ?? 0
          ],
          backgroundColor: ['#6366f1', '#f59e0b'],
          borderWidth: 0
        }]
      }
    });

    // 🔥 Bar
    new Chart(barCanvas, {
      type: 'bar',
      data: {
        labels: ['Customers', 'Sellers'],
        datasets: [{
          data: [
            this.data.totalCustomers ?? 0,
            this.data.totalSellers ?? 0
          ],
          backgroundColor: ['#6366f1', '#10b981']
        }]
      }
    });
  }
}
