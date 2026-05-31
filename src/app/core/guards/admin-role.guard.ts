import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminRoleGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    void router.navigate(['/admin/login']);
    return false;
  }

  const role = (auth.getRole() || '').toUpperCase();
  if (role !== 'ADMIN') {
    void router.navigate(['/admin/login']);
    return false;
  }

  return true;
};
