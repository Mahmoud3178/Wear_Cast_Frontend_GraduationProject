import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ShipmentsComponent } from './shipments/shipments.component';
import { DriversComponent } from './drivers/drivers.component';
import { ShippingProfileComponent } from './profile/profile.component';

import { ShippingLayoutComponent } from './shipping-layout/shipping-layout.component';

export const SHIPPING_ROUTES: Routes = [
  {
    path: '',
    component: ShippingLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'shipments', component: ShipmentsComponent },
      { path: 'drivers', component: DriversComponent },
      { path: 'profile', component: ShippingProfileComponent }
    ]
  }
];
