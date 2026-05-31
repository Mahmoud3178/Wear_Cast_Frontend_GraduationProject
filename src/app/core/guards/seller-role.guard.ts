import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const sellerRoleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const url = route.url.map(s => s.path).join('/');
  if (url === 'login') return true;

  if (!auth.isLoggedIn()) {
    void router.navigate(['/login']);
    return false;
  }

  const role = (auth.getRole() || '').toUpperCase();
  if (role !== 'SELLER') {
    void router.navigate(['/login']);
    return false;
  }

  return true;
};
