import { Routes } from '@angular/router';

export const routes: Routes = [

{
  path: 'seller',
  loadChildren: () =>
    import('./features/seller/seller.routes')
      .then(m => m.SELLER_ROUTES)
},
  {
    path: '',
    redirectTo: 'seller',
    pathMatch: 'full'
  }


];
