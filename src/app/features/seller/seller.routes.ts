import { Routes } from '@angular/router';

export const SELLER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/seller-layout/seller-layout.component')
        .then(m => m.SellerLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard.component')
            .then(m => m.DashboardComponent)
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./products/products.component')
            .then(m => m.ProductsComponent)
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./orders/orders.component')
            .then(m => m.OrdersComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
