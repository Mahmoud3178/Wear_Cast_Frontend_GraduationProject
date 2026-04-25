import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Public catalog reads: sending a customer JWT makes some backends take an
 * authenticated code path that can throw (e.g. null reference). Omit Authorization.
 */
function isPublicFixedProductCatalogGet(url: string, method: string): boolean {
  if (method !== 'GET') return false;
  const u = url.toLowerCase();
  return (
    u.includes('/api/fixedproduct/getdetailsbyid/') ||
    u.includes('/api/fixedproduct/getall') ||
    u.includes('/api/fixedproduct/getbyid/') ||
    u.includes('/api/fixedproductcolor/getcolorbyid/') ||
    u.includes('/api/fixedproductcolor/getallcolorbyproductid/')
  );
}

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

  if (isPublicFixedProductCatalogGet(req.url, req.method)) {
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
