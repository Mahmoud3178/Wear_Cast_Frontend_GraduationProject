import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DeliveriesComponent } from './deliveries/deliveries.component';
import { DriverProfileComponent } from './profile/profile.component';
import { DriverLayoutComponent } from './driver-layout/driver-layout.component';

export const DRIVER_ROUTES: Routes = [
  {
    path: '',
    component: DriverLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'deliveries', component: DeliveriesComponent },
      { path: 'profile', component: DriverProfileComponent }
    ]
  }
];
