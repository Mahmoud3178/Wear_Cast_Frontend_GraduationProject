import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { FormsModule } from '@angular/forms';
import { HandelDashboardService } from '../../../core/services/handel-dashboard.service';

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

  constructor(private service: HandelDashboardService) {}

  ngOnInit() {
    this.loadDashboard();
    this.loadCommission();
  }

  // ================= DASHBOARD =================
  loadDashboard() {
    this.service.getDashboard().subscribe((res: any) => {

      this.data = res.data;

      this.stats = [
        {
          title: 'Total Money Processed',
          value: this.data.totalMoneyProcessed + ' LE',
          icon: 'bi-cash',
          color: 'success'
        },

        {
          title: 'Order Items',
          value: this.data.totalOrderItems,
          icon: 'bi-box-seam',
          color: 'primary'
        },

        {
          title: 'Shipments',
          value: this.data.totalShipments,
          icon: 'bi-truck',
          color: 'warning'
        },

        {
          title: 'Customers',
          value: this.data.totalCustomers,
          icon: 'bi-people',
          color: 'info'
        },

        {
          title: 'Sellers',
          value: this.data.totalSellers,
          icon: 'bi-shop',
          color: 'dark'
        },

        {
          title: 'Products',
          value: this.data.totalProducts,
          icon: 'bi-box',
          color: 'secondary'
        },

        {
          title: 'Seller Orders',
          value: this.data.totalSellerOrders,
          icon: 'bi-person-badge',
          color: 'success'
        },

        {
          title: 'Factory Orders',
          value: this.data.totalFactoryOrders,
          icon: 'bi-building',
          color: 'danger'
        },
   
      ];

      setTimeout(() => this.createCharts());
    });
  }

  // ================= COMMISSION =================
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
        alert('Updated successfully ✅');
      },
      error: () => {
        this.loadingCommission = false;
        alert('Error ❌');
      }
    });
  }

  // ================= CHARTS =================
  createCharts() {

    // Orders
    new Chart('lineChart', {
      type: 'line',
      data: {
        labels: ['Seller Orders', 'Factory Orders'],
        datasets: [{
          data: [
            this.data.totalSellerOrders,
            this.data.totalFactoryOrders
          ],
          tension: 0.4
        }]
      },
      options: {
        plugins: { legend: { display: false } }
      }
    });

    // Users
    new Chart('barChart', {
      type: 'bar',
      data: {
        labels: ['Customers', 'Sellers'],
        datasets: [{
          data: [
            this.data.totalCustomers,
            this.data.totalSellers
          ]
        }]
      },
      options: {
        plugins: { legend: { display: false } }
      }
    });
  }
}
