import { Routes } from '@angular/router';

export const CUSTOMER_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard.component')
            .then(m => m.DashboardComponent)
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./orders/orders.component')
            .then(m => m.OrdersComponent)
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./profile/profile.component')
            .then(m => m.ProfileComponent)
      },
      {
        path: 'design',
        loadComponent: () =>
          import('./design/design.component')
            .then(m => m.CustomerDesignComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];

