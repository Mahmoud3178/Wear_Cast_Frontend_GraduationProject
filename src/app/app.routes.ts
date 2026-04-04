import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';

export const routes: Routes = [

{
  path: 'admin',
  loadChildren: () =>
    import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES)
},
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
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'confirm-email/customer',
    loadComponent: () =>
      import('./features/auth/confirm-customer-email/confirm-customer-email.component').then(
        m => m.ConfirmCustomerEmailComponent
      )
  },
  {
    path: 'confirm-email/seller',
    loadComponent: () =>
      import('./features/auth/confirm-seller-email/confirm-seller-email.component').then(
        m => m.ConfirmSellerEmailComponent
      )
  },
  {
    path: '',
    redirectTo: 'customer',
    pathMatch: 'full'
  }


];
