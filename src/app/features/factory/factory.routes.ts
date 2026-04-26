import { Routes } from '@angular/router';
import { factoryRoleGuard } from '../../core/guards/factory-role.guard';

export const FACTORY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/factory-layout/factory-layout.component').then(
        m => m.FactoryLayoutComponent
      ),
    canActivate: [factoryRoleGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/factory-dashboard.component').then(
            m => m.FactoryDashboardComponent
          )
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./products/factory-products.component').then(
            m => m.FactoryProductsComponent
          )
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./orders/factory-orders.component').then(
            m => m.FactoryOrdersComponent
          )
      },
      {
        path: 'products/new',
        loadComponent: () =>
          import('./product-wizard/factory-product-wizard.component').then(
            m => m.FactoryProductWizardComponent
          )
      },
      {
        path: 'products/:productId/edit',
        loadComponent: () =>
          import('./product-wizard/factory-product-wizard.component').then(
            m => m.FactoryProductWizardComponent
          )
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./profile/factory-profile.component').then(
            m => m.FactoryProfileComponent
          )
      },
      {
        path: 'managers',
        loadComponent: () =>
          import('./managers/factory-managers.component').then(
            m => m.FactoryManagersComponent
          )
      }
    ]
  }
];
