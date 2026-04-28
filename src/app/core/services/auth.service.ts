import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

const ROLE_CLAIM =
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

const CUSTOMER_PROFILE_KEY = 'wearcast:customerProfile';
export const FACTORY_ID_STORAGE_KEY = 'wearcast:factoryId';
const FACTORY_PORTAL_ACCOUNT_TYPE_KEY = 'wearcast:factoryPortalAccountType';
export type FactoryPortalAccountType = 'factory' | 'manager';

/** Registration + JWT merge for profile until a GET /me API exists. */
export interface CustomerProfileSnapshot {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  state: string;
  city: string;
  street: string;
  buildingNumber: string;
}

export interface AuthSession {
  token: string;
  refreshToken: string;
  role: string;
  /** Present for factory manager accounts when the API returns it. */
  factoryId?: number;
}

interface ApiEnvelope<T = unknown> {
  isSuccess: boolean;
  hasData?: boolean;
  data?: T;
  statusCode?: number;
  error?: { code: string; description: string };
  validationErrors?: Record<string, string | string[]>;
}

export interface CustomerRegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  profileImage: File | null;
  state: string;
  city: string;
  street: string;
  buildingNumber: string;
}

/** Session key so "confirm email" can recover userId after register (API needs userId + code). */
export function pendingCustomerUserIdStorageKey(email: string): string {
  return `wearcast:pendingCustomerUserId:${email.trim().toLowerCase()}`;
}

export interface RegisterCustomerResult {
  message: string;
  userId?: string;
}

export interface SellerApplicationForm {
  sellerManagerEmail: string;
  sellerManagerFirstName: string;
  sellerManagerLastName: string;
  sellerManagerPhoneNumber: string;
  sellerManagerPassword: string;
  sellerManagerConfirmPassword: string;
  sellerName: string;
  sellerEmail: string;
  sellerPhoneNumber: string;
  sellerCommercialRegisterNumber: string;
  sellerTaxIdNumber: string;
  sellerDescription: string;
  sellerLogo: File | null;
  sellerState: string;
  sellerCity: string;
  sellerStreet: string;
  sellerBuildingNumber: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = environment.apiUrl;

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  login(data: { email: string; password: string }): Observable<AuthSession> {
    const url = `${this.apiUrl}/api/auth/login`;
    return this.http.post<ApiEnvelope>(url, data).pipe(
      map(body => this.mapLoginResponse(body)),
      catchError(err => this.handleHttpError(err))
    );
  }

  refreshToken(): Observable<AuthSession> {
    const token = localStorage.getItem('token') || '';
    const refreshToken = localStorage.getItem('refreshToken') || '';
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }
    const url = `${this.apiUrl}/api/auth/refresh-token`;
    return this.http
      .post<ApiEnvelope | Record<string, unknown>>(url, {
        token,
        refreshToken,
        Token: token,
        RefreshToken: refreshToken
      })
      .pipe(
        map(body => {
          if (
            body &&
            typeof body === 'object' &&
            'isSuccess' in body &&
            (body as ApiEnvelope).isSuccess === false
          ) {
            throw this.apiFailure(body as ApiEnvelope);
          }
          const payload = unwrapAuthPayload(body);
          return this.normalizeLoginData(payload);
        }),
        catchError(err => this.handleHttpError(err))
      );
  }

  revokeRefreshToken(): Observable<void> {
    const token = localStorage.getItem('token') || '';
    const refreshToken = localStorage.getItem('refreshToken') || '';
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }
    const url = `${this.apiUrl}/api/auth/revoke-refresh-token`;
    return this.http
      .post<ApiEnvelope | Record<string, unknown>>(url, {
        token,
        refreshToken,
        Token: token,
        RefreshToken: refreshToken
      })
      .pipe(
        map(body => {
          if (
            body &&
            typeof body === 'object' &&
            'isSuccess' in body &&
            (body as ApiEnvelope).isSuccess === false
          ) {
            throw this.apiFailure(body as ApiEnvelope);
          }
        }),
        catchError(err => this.handleHttpError(err))
      );
  }

  /** Ask the API to send another confirmation email (same address used at registration). */
  resendConfirmationEmail(email: string): Observable<void> {
    const url = `${this.apiUrl}/api/auth/resend-confirmation-email`;
    return this.http.post<ApiEnvelope>(url, { email: email.trim() }).pipe(
      map(body => {
        if (!body.isSuccess) {
          throw this.apiFailure(body);
        }
      }),
      catchError(err => this.handleHttpError(err))
    );
  }

  /** Customer: POST /api/auth/confirm-email — body { userId, code }. */
  confirmCustomerEmail(userId: string, code: string): Observable<void> {
    const url = `${this.apiUrl}/api/auth/confirm-email`;
    return this.http
      .post<ApiEnvelope>(url, {
        userId: userId.trim(),
        code: code.trim()
      })
      .pipe(
        map(body => {
          if (!body.isSuccess) {
            throw this.apiFailure(body);
          }
        }),
        catchError(err => this.handleHttpError(err))
      );
  }

  /**
   * Seller manager: POST /api/seller-applications/{email}/confirm-email — body { code }.
   * Email is the seller manager email used on the application.
   */
  confirmSellerEmail(email: string, code: string): Observable<void> {
    const enc = encodeURIComponent(email.trim());
    const url = `${this.apiUrl}/api/seller-applications/${enc}/confirm-email`;
    return this.http
      .post<ApiEnvelope>(url, { code: code.trim() })
      .pipe(
        map(body => {
          if (!body.isSuccess) {
            throw this.apiFailure(body);
          }
        }),
        catchError(err => this.handleHttpError(err))
      );
  }

  /** Resend seller manager confirmation (no body). */
  resendSellerConfirmationEmail(email: string): Observable<void> {
    const enc = encodeURIComponent(email.trim());
    const url = `${this.apiUrl}/api/seller-applications/${enc}/resend-confirm-email`;
    return this.http.post<ApiEnvelope>(url, {}).pipe(
      map(body => {
        if (!body.isSuccess) {
          throw this.apiFailure(body);
        }
      }),
      catchError(err => this.handleHttpError(err))
    );
  }

  /**
   * Factory manager: POST /api/auth/confirm-email — body { userId, code }.
   * Uses generic auth endpoint (factory managers are users too).
   */
  confirmFactoryManagerEmail(userId: string, code: string): Observable<void> {
    const url = `${this.apiUrl}/api/auth/confirm-email`;
    return this.http
      .post<ApiEnvelope>(url, {
        userId: userId.trim(),
        code: code.trim()
      })
      .pipe(
        map(body => {
          if (!body.isSuccess) {
            throw this.apiFailure(body);
          }
        }),
        catchError(err => this.handleHttpError(err))
      );
  }

  /** Resend factory manager confirmation using generic endpoint. */
  resendFactoryManagerConfirmationEmail(email: string): Observable<void> {
    const url = `${this.apiUrl}/api/auth/resend-confirmation-email`;
    return this.http.post<ApiEnvelope>(url, { email: email.trim() }).pipe(
      map(body => {
        if (!body.isSuccess) {
          throw this.apiFailure(body);
        }
      }),
      catchError(err => this.handleHttpError(err))
    );
  }

  registerCustomer(data: CustomerRegisterForm): Observable<RegisterCustomerResult> {
    const fd = new FormData();
    fd.append('Email', data.email);
    fd.append('Password', data.password);
    fd.append('ConfirmPassword', data.confirmPassword);
    fd.append('FirstName', data.firstName);
    fd.append('LastName', data.lastName);
    fd.append('PhoneNumber', data.phoneNumber);
    fd.append('State', data.state);
    fd.append('City', data.city);
    fd.append('Street', data.street);
    fd.append('BuildingNumber', data.buildingNumber);
    if (data.profileImage) {
      fd.append('ProfileImage', data.profileImage, data.profileImage.name);
    }
    const url = `${this.apiUrl}/api/auth/register-customer`;
    return this.http.post<ApiEnvelope<Record<string, unknown>>>(url, fd).pipe(
      map(body => {
        if (!body.isSuccess) {
          throw this.apiFailure(body);
        }
        const d = body.data;
        const rawId =
          d && typeof d === 'object'
            ? (d['userId'] ?? d['UserId'])
            : undefined;
        const userId = typeof rawId === 'string' ? rawId : undefined;
        return { message: 'Registered successfully', userId };
      }),
      catchError(err => this.handleHttpError(err))
    );
  }

  registerSeller(data: SellerApplicationForm): Observable<{ message: string }> {
    const fd = new FormData();
    fd.append('SellerManagerEmail', data.sellerManagerEmail);
    fd.append('SellerManagerFirstName', data.sellerManagerFirstName);
    fd.append('SellerManagerLastName', data.sellerManagerLastName);
    fd.append('SellerManagerPhoneNumber', data.sellerManagerPhoneNumber);
    fd.append('SellerManagerPassword', data.sellerManagerPassword);
    fd.append('SellerManagerConfirmPassword', data.sellerManagerConfirmPassword);
    fd.append('SellerName', data.sellerName);
    fd.append('SellerEmail', data.sellerEmail);
    fd.append('SellerPhoneNumber', data.sellerPhoneNumber);
    fd.append(
      'SellerCommercialRegisterNumber',
      data.sellerCommercialRegisterNumber
    );
    fd.append('SellerTaxIdNumber', data.sellerTaxIdNumber);
    fd.append('SellerDescription', data.sellerDescription);
    fd.append('SellerState', data.sellerState);
    fd.append('SellerCity', data.sellerCity);
    fd.append('SellerStreet', data.sellerStreet);
    fd.append('SellerBuildingNumber', data.sellerBuildingNumber);
    if (data.sellerLogo) {
      fd.append('SellerLogo', data.sellerLogo, data.sellerLogo.name);
    }
    const url = `${this.apiUrl}/api/seller-applications`;
    return this.http.post<ApiEnvelope>(url, fd).pipe(
      map(body => {
        if (!body.isSuccess) {
          throw this.apiFailure(body);
        }
        return { message: 'Application submitted successfully' };
      }),
      catchError(err => this.handleHttpError(err))
    );
  }

  saveUser(res: AuthSession): void {
    const stored = this.readCustomerProfileRaw();
    const jwtEmail = this.pickEmailFromJwt(res.token);
    if (
      stored?.email &&
      jwtEmail &&
      stored.email.toLowerCase() !== jwtEmail.toLowerCase()
    ) {
      localStorage.removeItem(CUSTOMER_PROFILE_KEY);
    }
    localStorage.setItem('token', res.token);
    localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('role', res.role);
    const fid =
      res.factoryId ?? this.extractFactoryIdFromSession(res.token);
    if (fid != null) {
      localStorage.setItem(FACTORY_ID_STORAGE_KEY, String(fid));
    } else {
      localStorage.removeItem(FACTORY_ID_STORAGE_KEY);
    }
    this.syncCustomerProfileFromCurrentToken();
  }

  getFactoryId(): number | null {
    const raw = localStorage.getItem(FACTORY_ID_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  }

  private extractFactoryIdFromSession(token: string): number | null {
    const fromJwt = this.pickFactoryIdFromPayload(this.decodeJwtPayload(token));
    if (fromJwt != null) {
      return fromJwt;
    }
    return null;
  }

  private pickFactoryIdFromPayload(
    payload: Record<string, unknown> | null
  ): number | null {
    if (!payload) {
      return null;
    }
    const keys = [
      'factoryId',
      'FactoryId',
      'factory_id',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/factoryid'
    ];
    for (const k of keys) {
      const v = payload[k];
      if (typeof v === 'number' && Number.isFinite(v)) {
        return v;
      }
      if (typeof v === 'string' && /^\d+$/.test(v)) {
        return parseInt(v, 10);
      }
    }
    return null;
  }

  /** Call after customer registration (before email confirm). */
  saveCustomerProfileFromRegister(form: CustomerRegisterForm): void {
    const p: CustomerProfileSnapshot = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phoneNumber: form.phoneNumber.trim(),
      state: form.state.trim(),
      city: form.city.trim(),
      street: form.street.trim(),
      buildingNumber: form.buildingNumber.trim()
    };
    localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(p));
  }

  getCustomerProfile(): CustomerProfileSnapshot | null {
    return this.readCustomerProfileRaw();
  }

  /** Merge name/email from JWT into stored profile (e.g. after login). */
  syncCustomerProfileFromCurrentToken(): void {
    const t = this.getToken();
    if (!t) {
      return;
    }
    const payload = this.decodeJwtPayload(t);
    if (!payload) {
      return;
    }
    const cur =
      this.readCustomerProfileRaw() ?? this.emptyCustomerProfile();
    const email = this.pickEmailFromPayload(payload);
    if (email) {
      cur.email = email;
    }
    const names = this.pickNamesFromPayload(payload);
    if (names.first && !cur.firstName) {
      cur.firstName = names.first;
    }
    if (names.last && !cur.lastName) {
      cur.lastName = names.last;
    }
    localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(cur));
  }

  getRole(): string | null {
    return localStorage.getItem('role');
  }

  getCurrentUserId(): string | null {
    const t = this.getToken();
    if (!t) return null;
    const payload = this.decodeJwtPayload(t);
    if (!payload) return null;
    const uid =
      payload['nameid'] ??
      payload['sub'] ??
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
    return uid ? String(uid) : null;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /** Get user roles from stored role or JWT token */
  getUserRoles(): string[] {
    const storedRole = localStorage.getItem('role');
    if (storedRole) {
      return [storedRole.toLowerCase()];
    }
    const token = this.getToken();
    if (!token) return [];
    return this.rolesFromJwt(token).map(r => r.toLowerCase());
  }

  isFactoryManager(): boolean {
    const payload = this.decodeJwtPayload(this.getToken() || '');
    if (payload) {
      const roles = this.rolesFromPayload(payload).map(r =>
        this.normalizeRole(r)
      );
      // If token contains FACTORY, treat it as factory account.
      if (roles.includes('FACTORY')) {
        return false;
      }
      return roles.includes('FACTORY_MANAGER');
    }
    const roles = this.getUserRoles();
    return roles.some(r => this.normalizeRole(r) === 'FACTORY_MANAGER');
  }

  isFactoryAccount(): boolean {
    const payload = this.decodeJwtPayload(this.getToken() || '');
    if (payload) {
      const roles = this.rolesFromPayload(payload).map(r =>
        this.normalizeRole(r)
      );
      if (roles.includes('FACTORY')) {
        return true;
      }
      if (roles.includes('FACTORY_MANAGER')) {
        return false;
      }
    }
    const role = this.getRole();
    return !!role && this.normalizeRole(role) === 'FACTORY';
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  logout(): void {
    this.revokeRefreshToken().subscribe({ error: () => {} });
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('role');
    localStorage.removeItem(CUSTOMER_PROFILE_KEY);
    localStorage.removeItem(FACTORY_ID_STORAGE_KEY);
    void this.router.navigate(['/login']);
  }

  /** Factory portal sign-out → factory login screen. */
  logoutFactory(): void {
    this.revokeRefreshToken().subscribe({ error: () => {} });
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('role');
    localStorage.removeItem(FACTORY_ID_STORAGE_KEY);
    localStorage.removeItem(FACTORY_PORTAL_ACCOUNT_TYPE_KEY);
    void this.router.navigate(['/factory/login']);
  }

  setFactoryPortalAccountType(type: FactoryPortalAccountType): void {
    localStorage.setItem(FACTORY_PORTAL_ACCOUNT_TYPE_KEY, type);
  }

  getFactoryPortalAccountType(): FactoryPortalAccountType | null {
    const raw = localStorage.getItem(FACTORY_PORTAL_ACCOUNT_TYPE_KEY);
    if (raw === 'factory' || raw === 'manager') {
      return raw;
    }
    return null;
  }

  private readCustomerProfileRaw(): CustomerProfileSnapshot | null {
    const raw = localStorage.getItem(CUSTOMER_PROFILE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as CustomerProfileSnapshot;
    } catch {
      return null;
    }
  }

  private emptyCustomerProfile(): CustomerProfileSnapshot {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      state: '',
      city: '',
      street: '',
      buildingNumber: ''
    };
  }

  private pickEmailFromJwt(token: string): string | undefined {
    const p = this.decodeJwtPayload(token);
    return p ? this.pickEmailFromPayload(p) : undefined;
  }

  private pickEmailFromPayload(payload: Record<string, unknown>): string | undefined {
    const keys = [
      'email',
      'unique_name',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'
    ];
    for (const k of keys) {
      const v = payload[k];
      if (typeof v === 'string' && v.includes('@')) {
        return v.trim();
      }
    }
    return undefined;
  }

  private pickNamesFromPayload(payload: Record<string, unknown>): {
    first: string;
    last: string;
  } {
    const given =
      payload['given_name'] ??
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'];
    const family =
      payload['family_name'] ??
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'];
    if (typeof given === 'string' && typeof family === 'string') {
      return { first: given.trim(), last: family.trim() };
    }
    const name =
      payload['name'] ??
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
    if (typeof name === 'string' && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return {
          first: parts[0],
          last: parts.slice(1).join(' ')
        };
      }
      return { first: parts[0] ?? '', last: '' };
    }
    return { first: '', last: '' };
  }

  private mapLoginResponse(body: ApiEnvelope | null | undefined): AuthSession {
    if (!body || typeof body !== 'object') {
      throw new Error('Invalid response from server');
    }
    if (!body.isSuccess) {
      throw this.apiFailure(body);
    }
    const raw = body.data as Record<string, unknown> | undefined;
    if (raw && typeof raw === 'object' && 'data' in raw && raw['data']) {
      return this.normalizeLoginData(raw['data'] as Record<string, unknown>);
    }
    return this.normalizeLoginData(raw as Record<string, unknown>);
  }

  private normalizeLoginData(data: Record<string, unknown>): AuthSession {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid login response from server');
    }
    const token = this.pickString(data, [
      'token',
      'Token',
      'accessToken',
      'AccessToken',
      'jwtToken',
      'JwtToken',
      'access_token'
    ]);
    if (!token) {
      throw new Error('No access token in login response');
    }
    const refreshToken =
      this.pickString(data, ['refreshToken', 'RefreshToken']) ?? '';
    let role: string | undefined = this.pickString(data, ['role', 'Role']);
    if (!role) {
      role = this.roleFromJwt(token) ?? undefined;
    }
    let factoryId: number | undefined;
    const rawFid = data['factoryId'] ?? data['FactoryId'];
    if (typeof rawFid === 'number' && Number.isFinite(rawFid)) {
      factoryId = rawFid;
    } else if (typeof rawFid === 'string' && /^\d+$/.test(rawFid)) {
      factoryId = parseInt(rawFid, 10);
    }
    return {
      token,
      refreshToken,
      role: this.normalizeRole(role ?? 'CUSTOMER'),
      factoryId
    };
  }

  private pickString(
    obj: Record<string, unknown>,
    keys: string[]
  ): string | undefined {
    for (const k of keys) {
      const v = obj[k];
      if (typeof v === 'string' && v.length > 0) {
        return v;
      }
    }
    return undefined;
  }

  private roleFromJwt(token: string): string | null {
    const roles = this.rolesFromJwt(token);
    if (roles.length === 0) {
      return null;
    }
    return roles[0];
  }

  private rolesFromJwt(token: string): string[] {
    const payload = this.decodeJwtPayload(token);
    if (!payload) {
      return [];
    }
    return this.rolesFromPayload(payload);
  }

  private rolesFromPayload(payload: Record<string, unknown>): string[] {
    const r = payload['role'] ?? payload[ROLE_CLAIM];
    if (typeof r === 'string' && r.trim()) {
      return [r.trim()];
    }
    if (Array.isArray(r)) {
      return r.filter(
        (x): x is string => typeof x === 'string' && x.trim().length > 0
      );
    }
    return [];
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const part = token.split('.')[1];
      if (!part) {
        return null;
      }
      const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '==='.slice((base64.length + 3) % 4);
      const json = atob(padded);
      return JSON.parse(json) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private normalizeRole(r: string): string {
    const u = r.toUpperCase();
    if (u.includes('FACTORYMANAGER') || u.includes('FACTORY_MANAGER')) {
      return 'FACTORY_MANAGER';
    }
    if (u.includes('ADMIN')) {
      return 'ADMIN';
    }
    if (u.includes('FACTORY')) {
      return 'FACTORY';
    }
    if (u.includes('SELLER')) {
      return 'SELLER';
    }
    if (u.includes('SHIPPING')) {
      return 'SHIPPING';
    }
    if (u.includes('DRIVER')) {
      return 'DRIVER';
    }
    return 'CUSTOMER';
  }

  private apiFailure(body: ApiEnvelope): Error {
    const desc = body.error?.description;
    if (desc) {
      return new Error(desc);
    }
    if (body.validationErrors) {
      const parts = Object.entries(body.validationErrors).map(([k, v]) => {
        const msg = Array.isArray(v) ? v.join(', ') : v;
        return `${k}: ${msg}`;
      });
      return new Error(parts.join('; ') || 'Request failed');
    }
    return new Error('Request failed');
  }

  /** ASP.NET ProblemDetails and similar shapes (often on 4xx/5xx). */
  private messageFromProblemDetails(body: unknown): string | null {
    if (!body || typeof body !== 'object') {
      return null;
    }
    const o = body as Record<string, unknown>;
    const detail = o['detail'] ?? o['Detail'];
    if (typeof detail === 'string' && detail.trim()) {
      return detail.trim();
    }
    const title = o['title'] ?? o['Title'];
    if (typeof title === 'string' && title.trim()) {
      return title.trim();
    }
    return null;
  }

  private messageFromLooseApiBody(body: unknown): string | null {
    if (!body || typeof body !== 'object') {
      return null;
    }
    const o = body as Record<string, unknown>;
    const errObj = o['error'];
    if (errObj && typeof errObj === 'object') {
      const e = errObj as Record<string, unknown>;
      const d = e['description'] ?? e['Description'];
      if (typeof d === 'string' && d.trim()) {
        return d.trim();
      }
    }
    const msg = o['message'] ?? o['Message'];
    if (typeof msg === 'string' && msg.trim()) {
      return msg.trim();
    }
    return null;
  }

  private handleHttpError(err: unknown): Observable<never> {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;

      if (body && typeof body === 'object' && 'isSuccess' in body) {
        const env = body as ApiEnvelope;
        if (env.isSuccess === false) {
          return throwError(() => this.apiFailure(env));
        }
      }

      const problem = this.messageFromProblemDetails(body);
      if (problem) {
        return throwError(() => new Error(problem));
      }

      const loose = this.messageFromLooseApiBody(body);
      if (loose) {
        return throwError(() => new Error(loose));
      }

      if (typeof body === 'string' && body.length > 0 && body.length < 4000) {
        const trimmed = body.trim();
        if (trimmed && !trimmed.startsWith('<')) {
          return throwError(() => new Error(trimmed));
        }
      }

      if (err.status === 0) {
        return throwError(
          () =>
            new Error(
              'Cannot reach the server. If you are on localhost, run `ng serve` (with proxy) instead of opening built files directly. Otherwise check your network or CORS settings on the API.'
            )
        );
      }

      if (err.status === 500) {
        return throwError(
          () =>
            new Error(
              'The API returned an internal error (500) while sending email. That is handled on the server—usually missing or broken SMTP/email settings. Ask the backend team to check logs and mail configuration; your frontend request is reaching the API correctly.'
            )
        );
      }

      return throwError(
        () => new Error(err.message || `HTTP error ${err.status}`)
      );
    }
    if (err instanceof Error) {
      return throwError(() => err);
    }
    return throwError(() => new Error(String(err)));
  }
}

function unwrapAuthPayload(
  body: ApiEnvelope | Record<string, unknown>
): Record<string, unknown> {
  if (!body || typeof body !== 'object') {
    return {};
  }
  const o = body as Record<string, unknown>;
  let payload: unknown =
    o['data'] ?? o['Data'] ?? o['result'] ?? o['Result'] ?? body;
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const p = payload as Record<string, unknown>;
    const inner = p['data'] ?? p['Data'];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      payload = inner;
    }
  }
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {};
}
