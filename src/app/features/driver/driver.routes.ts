import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ProfileComponent } from './profile/profile.component';
import { DriverLayoutComponent } from './driver-layout/driver-layout.component';
import { ShipmentsListComponent } from './shipments/shipments-list/shipments-list.component';
import { ShipmentDetailsComponent } from './shipments/shipment-details/shipment-details.component';
import { DetailOrdersComponent } from './shipments/detail-orders/detail-orders.component';

export const DRIVER_ROUTES: Routes = [
  {
    path: '',
    component: DriverLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'shipments', component: ShipmentsListComponent },
      { path: 'shipments/:id', component: ShipmentDetailsComponent },
      { path: 'detail-orders', component: DetailOrdersComponent },
      {
        path: 'notifications',
        loadComponent: () =>
          import('../../shared/components/notifications-list/notifications-list.component').then(
            m => m.NotificationsListComponent
          ),
        data: {
          portalRole: 'driver',
          subtitle: 'Manage Your Delivery Notifications'
        }
      }
    ]
  }
];
