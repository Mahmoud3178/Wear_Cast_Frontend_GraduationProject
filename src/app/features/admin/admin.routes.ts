import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/admin-layout/admin-layout.component')
        .then(m => m.AdminLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard.component')
            .then(m => m.DashboardComponent)
      },
  {
    path: 'users',
    loadComponent: () =>
      import('./users/users.component').then(m => m.UsersComponent)
  },
  {
    path: 'reports',
    loadComponent: () =>
      import('./reports/reports.component').then(m => m.ReportsComponent)
  },
    {
    path: 'stores',
    loadComponent: () =>
      import('./stores/stores.component').then(m => m.StoresComponent)
  },

      {
        path: 'stores/:id',
        loadComponent: () =>
          import('./store-details/store-details.component')
            .then(m => m.StoreDetailsComponent)
      },

    {
    path: 'products',
    loadComponent: () =>
      import('./products/products.component').then(m => m.ProductsComponent)
  },
  {
  path: 'products/:id',
  loadComponent: () =>
    import('./product-details/product-details.component')
      .then(m => m.ProductDetailsComponent)
},
{
  path: 'customers',
  loadComponent: () =>
    import('./customers/customers.component')
      .then(m => m.CustomersComponent)
},
{
  path: 'customers/:id',
  loadComponent: () =>
    import('./customers-details/customers-details.component')
      .then(m => m.CustomersDetailsComponent)
},
{
  path: 'orders',
  loadComponent: () =>
    import('./orders/orders.component')
      .then(m => m.OrdersComponent)
},
{
  path: 'delivery-company',
  loadComponent: () =>
    import('./delivery-company/delivery-company.component')
      .then(m => m.DeliveryCompanyComponent)
},
{
  path: 'templets',
  loadComponent: () =>
    import('./templets/templets.component')
      .then(m => m.TempletsComponent)
},
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
]
}
];
