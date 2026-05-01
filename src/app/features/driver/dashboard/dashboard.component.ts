import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DriverService } from '../../../core/services/driver.service';
import { DriverShipment, ShipmentStatus } from '../../../core/models/shipment.model';
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
          { 
            title: "Today's Tasks", 
            value: stats.todayDeliveries, 
            icon: 'bi-box-seam', 
            colorClass: 'text-primary',
            trend: '+12%',
            trendUp: true
          },
          { 
            title: 'Successful Deliveries', 
            value: stats.completedDeliveries, 
            icon: 'bi-check2-all', 
            colorClass: 'text-success',
            trend: '+5%',
            trendUp: true
          },
          { 
            title: 'Total Earnings', 
            value: '$' + stats.totalEarnings.toFixed(2), 
            icon: 'bi-wallet2', 
            colorClass: 'text-warning',
            trend: '+8%',
            trendUp: true
          }
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
