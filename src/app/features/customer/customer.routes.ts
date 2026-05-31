import { Routes } from '@angular/router';

export const CUSTOMER_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('./home/home.component')
            .then(m => m.HomeComponent)
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
        path: 'product/:id',
        loadComponent: () =>
          import('./product-detail/product-detail.component')
            .then(m => m.ProductDetailComponent)
      },
      {
        path: 'cart',
        loadComponent: () =>
          import('./cart/cart.component')
            .then(m => m.CartComponent)
      },
      {
        path: 'checkout',
        loadComponent: () =>
          import('./checkout/checkout.component')
            .then(m => m.CheckoutComponent)
      },
      {
        path: 'category',
        loadComponent: () =>
          import('./category/category.component')
            .then(m => m.CategoryComponent)
      },
      {
        path: 'favourites',
        loadComponent: () =>
          import('./favourites/favourites.component')
            .then(m => m.FavouritesComponent)
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./notifications/customer-notifications.component')
            .then(m => m.CustomerNotificationsComponent)
      },
      //       {
      //   path: 'register',
      //   loadComponent: () =>
      //     import('./register-customer/register-customer.component')
      //       .then(m => m.RegisterCustomerComponent)
      // },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  }
];

