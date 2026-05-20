import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import Chart from 'chart.js/auto';
import { AuthService } from '../../../core/services/auth.service';
import { DriverService } from '../../../core/services/driver.service';
import { DriverDashboardStats } from '../../../core/models/dashboard.model';
import { DriverStatus, DeliveryVehicleType } from '../../../core/models/driver.model';
import { DriverShipment, ShipmentStatus } from '../../../core/models/shipment.model';

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('statusChart') statusChartRef!: ElementRef;

  private readonly authService = inject(AuthService);
  private readonly driverService = inject(DriverService);

  isLoading = false;
  userName = 'Driver';
  today = new Date();

  dashboardStats: DriverDashboardStats | null = null;
  stats: any[] = [];
  statusBreakdown: { [key: string]: number } = {
    'Assigned': 0,
    'Picking Up': 0,
    'Out For Delivery': 0,
    'Delivered': 0
  };

  private statusChartInstance: any = null;

  ngOnInit(): void {
    const profile = this.authService.getCustomerProfile();
    if (profile && profile.firstName) {
      this.userName = `${profile.firstName} ${profile.lastName || ''}`.trim();
    }
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    if (this.dashboardStats) {
      this.initStatusChart();
    }
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.driverService.getDriverDashboard().subscribe({
      next: (data) => {
        this.isLoading = false;
        this.dashboardStats = data;
        
        this.stats = [
          { title: 'Pending Orders', value: data.pendingOrders || 0, icon: 'bi-hourglass-split', color: 'warning' },
          { title: 'Picked Up Orders', value: data.pickedUpOrders || 0, icon: 'bi-box-seam', color: 'info' },
          { title: 'Assigned Shipments', value: data.assignedShipments || 0, icon: 'bi-journal-check', color: 'secondary' },
          { title: 'Picking Up', value: data.pickingUpShipments || 0, icon: 'bi-truck-flatbed', color: 'primary' },
          { title: 'Out For Delivery', value: data.outForDeliveryShipments || 0, icon: 'bi-truck', color: 'info' },
          { title: 'Delivered', value: data.deliveredShipments || 0, icon: 'bi-check-circle-fill', color: 'success' }
        ];

        this.statusBreakdown = {
          'Assigned': data.assignedShipments || 0,
          'Picking Up': data.pickingUpShipments || 0,
          'Out For Delivery': data.outForDeliveryShipments || 0,
          'Delivered': data.deliveredShipments || 0
        };

        // Initialize status chart
        setTimeout(() => {
          if (this.statusChartRef) {
            this.initStatusChart();
          }
        }, 50);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Failed to load driver dashboard data', err);
      }
    });
  }

  toggleStatus(): void {
    const driverId = this.authService.getDriverId();
    if (!driverId || !this.dashboardStats) return;

    const currentIsAvailable = this.getDriverStatusName(this.dashboardStats.driverStatus) === 'Available';
    const newStatus = currentIsAvailable ? DriverStatus.NotAvailable : DriverStatus.Available;

    this.isLoading = true;
    this.driverService.changeDriverStatus(driverId, { driverId, newStatus }).subscribe({
      next: () => {
        this.isLoading = false;
        if (this.dashboardStats) {
          this.dashboardStats.driverStatus = newStatus;
        }
        this.loadDashboardData();
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Failed to change driver status', err);
      }
    });
  }

  getVehicleName(type: any): string {
    if (type === undefined || type === null) return 'N/A';
    if (typeof type === 'string') return type;
    
    switch (Number(type)) {
      case DeliveryVehicleType.Bicycle: return 'Bicycle';
      case DeliveryVehicleType.Motorcycle: return 'Motorcycle';
      case DeliveryVehicleType.Car: return 'Car';
      case DeliveryVehicleType.Van: return 'Van';
      default: return 'Vehicle';
    }
  }

  getVehicleIcon(type: any): string {
    if (type === undefined || type === null) return 'bi-truck';
    
    const typeStr = typeof type === 'string' ? type.toLowerCase() : '';
    if (typeStr.includes('bicycle')) return 'bi-bicycle';
    if (typeStr.includes('motorcycle')) return 'bi-bicycle';
    if (typeStr.includes('car')) return 'bi-car-front';
    if (typeStr.includes('van')) return 'bi-truck';

    switch (Number(type)) {
      case DeliveryVehicleType.Bicycle: return 'bi-bicycle';
      case DeliveryVehicleType.Motorcycle: return 'bi-bicycle';
      case DeliveryVehicleType.Car: return 'bi-car-front';
      case DeliveryVehicleType.Van: return 'bi-truck';
      default: return 'bi-truck';
    }
  }

  getDriverStatusName(status: any): string {
    if (status === undefined || status === null) return 'Unknown';
    if (typeof status === 'string') {
      return status === 'Available' ? 'Available' : 'Not Available';
    }
    return Number(status) === DriverStatus.Available ? 'Available' : 'Not Available';
  }

  getStatusName(status: string | ShipmentStatus): string {
    const statusStr = typeof status === 'number' ? ShipmentStatus[status] : status;
    switch (statusStr) {
      case 'Assigned': return 'Assigned';
      case 'PickingUp': return 'Picking Up';
      case 'OutForDelivery': return 'Out for Delivery';
      case 'Delivered': return 'Delivered';
      default: return statusStr || 'Unknown';
    }
  }

  getStatusClass(status: string | ShipmentStatus): string {
    const statusStr = typeof status === 'number' ? ShipmentStatus[status] : status;
    if (statusStr === 'Delivered') return 'status-success';
    if (statusStr === 'Assigned') return 'status-warning';
    if (statusStr === 'PickingUp') return 'status-info';
    if (statusStr === 'OutForDelivery') return 'status-primary';
    return 'status-secondary';
  }

  initStatusChart() {
    if (this.statusChartInstance) {
      this.statusChartInstance.destroy();
    }

    const dataValues = [
      this.statusBreakdown['Assigned'] || 0,
      this.statusBreakdown['Picking Up'] || 0,
      this.statusBreakdown['Out For Delivery'] || 0,
      this.statusBreakdown['Delivered'] || 0
    ];

    const allZero = dataValues.every(val => val === 0);
    const chartData = allZero ? [1, 1, 1, 1] : dataValues;
    const chartColors = allZero 
      ? ['#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b'] 
      : ['#3b82f6', '#f59e0b', '#06b6d4', '#10b981'];

    this.statusChartInstance = new Chart(this.statusChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Assigned', 'Picking Up', 'Out For Delivery', 'Delivered'],
        datasets: [{
          data: chartData,
          backgroundColor: chartColors,
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
            display: false
          },
          tooltip: {
            backgroundColor: '#1e293b',
            padding: 12,
            displayColors: true,
            callbacks: {
              label: (context: any) => {
                const label = context.label || '';
                const value = allZero ? 0 : context.raw;
                return ` ${label}: ${value}`;
              }
            }
          }
        }
      }
    });
  }
}
