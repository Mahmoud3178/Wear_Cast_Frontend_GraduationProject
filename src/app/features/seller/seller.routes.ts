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
  path: 'orders/:id',
  loadComponent: () =>
    import('./order-details/order-details.component')
      .then(m => m.OrderDetailsComponent)
    },
{
  path: 'add-product/:id',
  loadComponent: () =>
    import('./add-product/add-product.component')
      .then(m => m.AddProductComponent)
},
{
  path: 'edit-product/:id',
  loadComponent: () =>
    import('./edit-product/edit-product.component')
      .then(m => m.EditProductComponent)
},
{
  path: 'add-product',
  loadComponent: () =>
    import('./add-product/add-product.component')
      .then(m => m.AddProductComponent)
},
      {
      path: 'inventory',
        loadComponent: () =>
          import('./inventory/inventory.component')
            .then(m => m.InventoryComponent)
      },

      {
      path: 'profile',
        loadComponent: () =>
          import('./profile/profile.component')
            .then(m => m.ProfileComponent)
      },

      {
      path: 'saller-notifications',
        loadComponent: () =>
          import('./saller-notifications/saller-notifications.component')
            .then(m => m.SallerNotificationsComponent)
      },
      {
  path: 'managers',
  loadComponent: () =>
    import('./seller-managers/seller-managers.component')
      .then(m => m.SellerManagersComponent)
},
      // {
      //   path: 'register',
      //   loadComponent: () =>
      //     import('./register-seller/register-seller.component')
      //       .then(m => m.RegisterSellerComponent)
      // },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
