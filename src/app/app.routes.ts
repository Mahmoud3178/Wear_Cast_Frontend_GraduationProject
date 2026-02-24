import { Routes } from '@angular/router';

export const routes: Routes = [

{
  path: 'seller',
  loadChildren: () =>
    import('./features/seller/seller.routes')
      .then(m => m.SELLER_ROUTES)
},
{
  path: 'customer',
  loadChildren: () =>
    import('./features/customer/customer.routes')
      .then(m => m.CUSTOMER_ROUTES)
},
  {
    path: '',
    redirectTo: 'seller',
    pathMatch: 'full'
  }


];
