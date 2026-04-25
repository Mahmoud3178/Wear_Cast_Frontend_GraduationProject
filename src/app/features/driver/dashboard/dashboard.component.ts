import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DriverService } from '../../../core/services/driver.service';
import { DriverShipment } from '../../../core/models/shipment.model';
import { inject } from '@angular/core';

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private driverService = inject(DriverService);

  driverStats: any[] = [];
  currentRoute: DriverShipment | null = null;
  isLoading = true;

  constructor() { }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.isLoading = true;
    this.driverService.getAllDriverShipments().subscribe({
      next: (shipments) => {
        const stats = this.driverService.getDashboardStats(shipments);
        
        this.driverStats = [
          { title: "Today's Deliveries", value: stats.todayDeliveries, icon: 'bi-box-seam', colorClass: 'text-success' },
          { title: 'Completed', value: stats.completedDeliveries, icon: 'bi-check-circle', colorClass: 'text-primary' },
          { title: 'Earnings', value: '$' + stats.totalEarnings.toFixed(2), icon: 'bi-wallet2', colorClass: 'text-warning' }
        ];

        this.currentRoute = this.driverService.getCurrentRoute(shipments);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load dashboard data', err);
        this.isLoading = false;
      }
    });
  }

  getStatusName(status: number | undefined): string {
    if (status === undefined) return 'Unknown';
    switch (status) {
      case 0: return 'Pending';
      case 1: return 'Ready For Pickup';
      case 2: return 'In Transit';
      case 3: return 'Delivered';
      case 4: return 'Cancelled';
      default: return 'Unknown';
    }
  }
}
