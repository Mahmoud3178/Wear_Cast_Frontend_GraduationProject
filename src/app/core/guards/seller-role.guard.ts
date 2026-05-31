import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const sellerRoleGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

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
