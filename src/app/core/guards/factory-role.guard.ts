import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const factoryRoleGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const role = (auth.getRole() || '').toUpperCase();
  if (
    auth.isLoggedIn() &&
    (role === 'FACTORY' || role === 'FACTORY_MANAGER')
  ) {
    return true;
  }
  void router.navigate(['/factory/login']);
  return false;
};
