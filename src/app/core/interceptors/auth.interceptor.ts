import { HttpInterceptorFn } from '@angular/common/http';

const ANONYMOUS_AUTH_PATHS = [
  '/api/auth/login',
  '/api/auth/register-customer',
  '/api/auth/refresh-token',
  '/api/auth/forget-password',
  '/api/auth/reset-password',
  '/api/auth/confirm-email',
  '/api/auth/resend-confirmation-email'
];

function isAnonymousAuthRequest(url: string): boolean {
  if (ANONYMOUS_AUTH_PATHS.some(p => url.includes(p))) {
    return true;
  }
  // Seller manager email confirmation (no JWT yet)
  return /\/api\/seller-applications\/[^/]+\/(confirm-email|resend-confirm-email)(?:\?|$)/.test(
    url
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (isAnonymousAuthRequest(req.url)) {
    return next(req);
  }

  const token = localStorage.getItem('token');
  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    })
  );
};
