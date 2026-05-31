import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminRoleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // صفحة اللوجين نفسها — اسمحلها تعدي
  const url = route.url.map(s => s.path).join('/');
  if (url === 'login') return true;

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
