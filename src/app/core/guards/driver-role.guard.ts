import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const driverRoleGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  
  if (!auth.isLoggedIn()) {
    void router.navigate(['/driver-shipping/login']);
    return false;
  }
  
  const role = (auth.getRole() || '').toUpperCase();
  if (role !== 'DRIVER') {
    alert('Access Denied: You must be a Driver to view this page.');
    void router.navigate(['/']);
    return false;
  }
  
  return true;
};
