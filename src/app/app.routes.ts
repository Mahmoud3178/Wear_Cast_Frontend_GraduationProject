import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { shippingRoleGuard } from './core/guards/shipping-role.guard';
import { driverRoleGuard } from './core/guards/driver-role.guard';
import { adminRoleGuard } from './core/guards/admin-role.guard';
import { customerRoleGuard } from './core/guards/customer-role.guard';
import { sellerRoleGuard } from './core/guards/seller-role.guard';
import { factoryRoleGuard } from './core/guards/factory-role.guard';

export const routes: Routes = [

  // ✅ Splash — بدون guard عشان تظهر لأي حد
  {
    path: '',
    loadComponent: () =>
      import('./features/customer/home/home.component')
        .then(m => m.HomeComponent)
  },

  // ✅ Auth pages — بدون guards
  { path: 'login', component: LoginComponent },
  {
    path: 'driver-shipping/login',
    loadComponent: () =>
      import('./features/auth/driver-shipping-login/driver-shipping-login.component')
        .then(m => m.DriverShippingLoginComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component')
        .then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component')
        .then(m => m.ResetPasswordComponent)
  },
  {
    path: 'confirm-email/customer',
    loadComponent: () =>
      import('./features/auth/confirm-customer-email/confirm-customer-email.component')
        .then(m => m.ConfirmCustomerEmailComponent)
  },
  {
    path: 'confirm-email/seller',
    loadComponent: () =>
      import('./features/auth/confirm-seller-email/confirm-seller-email.component')
        .then(m => m.ConfirmSellerEmailComponent)
  },
  {
    path: 'confirm-email/factory-manager',
    loadComponent: () =>
      import('./features/auth/confirm-factory-manager-email/confirm-factory-manager-email.component')
        .then(m => m.ConfirmFactoryManagerEmailComponent)
  },
  {
    path: 'resend-confirmation/:type',
    loadComponent: () =>
      import('./features/auth/resend-confirmation/resend-confirmation.component')
        .then(m => m.ResendConfirmationComponent)
  },
  {
    path: 'factory/login',
    loadComponent: () =>
      import('./features/factory/factory-login/factory-login.component')
        .then(m => m.FactoryLoginComponent)
  },
  {
    path: 'factory/register',
    loadComponent: () =>
      import('./features/factory/factory-register/factory-register.component')
        .then(m => m.FactoryRegisterComponent)
  },

  // ✅ Protected routes — كل واحدة بـ guard مرة واحدة بس
{
  path: 'admin/login',
  loadComponent: () =>
    import('./features/auth/login-admin/login-admin.component')
      .then(m => m.LoginAdminComponent)
},
{
  path: 'admin',
  canActivate: [adminRoleGuard],
  loadChildren: () =>
    import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES)
},
  {
    path: 'customer',
    canActivate: [customerRoleGuard],
    loadChildren: () =>
      import('./features/customer/customer.routes').then(m => m.CUSTOMER_ROUTES)
  },
  {
    path: 'seller',
    canActivate: [sellerRoleGuard],
    loadChildren: () =>
      import('./features/seller/seller.routes').then(m => m.SELLER_ROUTES)
  },
  {
    path: 'factory',
    canActivate: [factoryRoleGuard],
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
// ✅ Register pages — بدون guards
{
  path: 'customer/register',
  loadComponent: () =>
    import('./features/customer/register-customer/register-customer.component')
      .then(m => m.RegisterCustomerComponent)
},
{
  path: 'seller/register',
  loadComponent: () =>
    import('./features/seller/register-seller/register-seller.component')
      .then(m => m.RegisterSellerComponent)
},
];
