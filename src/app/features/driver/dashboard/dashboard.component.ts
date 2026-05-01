import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DriverService } from '../../../core/services/driver.service';
import { DriverShipment } from '../../../core/models/shipment.model';
import { inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private driverService = inject(DriverService);
  private authService = inject(AuthService);

  driverStats: any[] = [];
  currentRoute: DriverShipment | null = null;
  isLoading = true;
  driverName = 'Driver';

  constructor() { }

  ngOnInit(): void {
    this.setDriverName();
    this.loadDashboardData();
  }

  setDriverName() {
    const profile = this.authService.getCustomerProfile();
    if (profile && profile.firstName) {
      this.driverName = profile.firstName;
    }
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
      case 1: return 'Pending';
      case 2: return 'Unassigned';
      case 3: return 'Assigned';
      case 4: return 'Picking Up';
      case 5: return 'Out For Delivery';
      case 6: return 'Delivered';
      default: return 'Unknown';
    }
  }
}
