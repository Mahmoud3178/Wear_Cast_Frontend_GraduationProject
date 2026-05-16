import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { shippingRoleGuard } from './core/guards/shipping-role.guard';
import { driverRoleGuard } from './core/guards/driver-role.guard';

export const routes: Routes = [

  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.routes')
        .then(m => m.ADMIN_ROUTES)
  },
  {
    path: 'seller',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  // ✅ باقي seller routes
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
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        m => m.ForgotPasswordComponent
      )
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(
        m => m.ResetPasswordComponent
      )
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
    path: 'confirm-email/factory-manager',
    loadComponent: () =>
      import('./features/auth/confirm-factory-manager-email/confirm-factory-manager-email.component').then(
        m => m.ConfirmFactoryManagerEmailComponent
      )
  },
  {
    path: 'resend-confirmation/:type',
    loadComponent: () =>
      import('./features/auth/resend-confirmation/resend-confirmation.component').then(
        m => m.ResendConfirmationComponent
      )
  },
  {
    path: 'factory/login',
    loadComponent: () =>
      import('./features/factory/factory-login/factory-login.component').then(
        m => m.FactoryLoginComponent
      )
  },
  {
    path: 'factory/register',
    loadComponent: () =>
      import('./features/factory/factory-register/factory-register.component').then(
        m => m.FactoryRegisterComponent
      )
  },
  {
    path: 'factory',
    loadChildren: () =>
      import('./features/factory/factory.routes').then(m => m.FACTORY_ROUTES)
  },
  {
    path: 'shipping',
    canActivate: [shippingRoleGuard],
    loadChildren: () =>
      import('./features/shipping/shipping.routes').then(m => m.SHIPPING_ROUTES)
  },
  {
    path: 'driver',
    canActivate: [driverRoleGuard],
    loadChildren: () =>
      import('./features/driver/driver.routes').then(m => m.DRIVER_ROUTES)
  },
  {
    path: '',
    redirectTo: 'customer',
    pathMatch: 'full'
  }
];
