import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
    // 🔥 LOGIN خارج layout
  {
    path: 'login',
    loadComponent: () =>
      import('../auth/login-admin/login-admin.component')
        .then(m => m.LoginAdminComponent)
  },
   {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

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
  path: 'design-products',
  loadComponent: () =>
    import('./design-products/design-products.component')
      .then(m => m.DesignProductsComponent)
},
{
  path: 'design-products/:id',
  loadComponent: () =>
    import('./design-product-details/design-product-details.component')
      .then(m => m.DesignProductDetailsComponent)
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
    path: 'seller-applications',
    loadComponent: () =>
      import('./seller-apllications/seller-apllications.component')
        .then(m => m.SellerApllicationsComponent)
  },
  {
  path: 'categories',
  loadComponent: () =>
    import('./category-for-admin/category-for-admin.component')
      .then(m => m.CategoryForAdminComponent)
},
  {
  path: 'Factory',
  loadComponent: () =>
    import('./factory/factory.component')
      .then(m => m.FactoryComponent)
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
  path: 'logos',
  loadComponent: () =>
    import('./logos/logos.component')
      .then(m => m.LogosComponent)
},
{
  path: 'add-logos',
  loadComponent: () =>
    import('./add-logos/add-logos.component')
      .then(m => m.AddLogosComponent)
},

{
  path: 'admins',
  loadComponent: () =>
    import('./admins/admins.component')
      .then(m => m.AdminsComponent)
},
{
  path: 'admins/add',
  loadComponent: () =>
    import('./add-admin/add-admin.component')
      .then(m => m.AddAdminComponent)
},
{
  path: 'admins/:id',
  loadComponent: () =>
    import('./admin-details/admin-details.component')
      .then(m => m.AdminDetailsComponent)
},
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },

]
}
];
