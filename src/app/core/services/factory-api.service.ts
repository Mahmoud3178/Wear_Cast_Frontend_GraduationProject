import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/** Matches typical API `ViewSide` enum order used by WearCast. */
export const VIEW_SIDE = {
  // Backend rejects `0` ("The value '0' is invalid"), so use 1-based enum codes.
  Front: 1,
  Back: 2,
  Right: 3,
  Left: 4
} as const;

/**
 * Backend `TargetAudience` enum (integer). Value `0` is rejected by the API.
 * @see CreateDesignedProductRequest in OpenAPI
 */
export const TARGET_AUDIENCE_OPTIONS: ReadonlyArray<{
  label: string;
  value: number;
}> = [
  { label: 'Men', value: 1 },
  { label: 'Women', value: 2 },
  { label: 'Kids', value: 3 },
  { label: 'Unisex', value: 4 }
];

interface ApiEnvelope<T = unknown> {
  isSuccess: boolean;
  data?: T;
  error?: { code: string; description: string };
  validationErrors?: Record<string, string | string[]>;
}

export interface CategoryDto {
  id?: number;
  Id?: number;
  name?: string;
  Name?: string;
}

export interface FactoryRegisterForm {
  managerEmail: string;
  managerFirstName: string;
  managerLastName: string;
  managerPhoneNumber: string;
  managerPassword: string;
  managerConfirmPassword: string;
  factoryName: string;
  factoryEmail: string;
  factoryPhoneNumber: string;
  factoryCommercialRegisterNumber: string;
  factoryTaxIdNumber: string;
  factoryDescription: string;
  factoryLogo: File | null;
  factoryState: string;
  factoryCity: string;
  factoryStreet: string;
  factoryBuildingNumber: string;
}

/** Backend `Size` enum as JSON strings (stable if numeric values change). */
export const WEARCAST_SIZE_ENUM_STRINGS = [
  '_2XS',
  '_XS',
  '_S',
  '_M',
  '_L',
  '_XL',
  '_2XL',
  '_3XL',
  '_4XL',
  '_5XL'
] as const;

export type WearcastSizeString = (typeof WEARCAST_SIZE_ENUM_STRINGS)[number];

export interface CreateDesignedProductPayload {
  name: string;
  description: string;
  targetAudiences: number[];
  price: number;
  canvasWidth: number;
  canvasHeight: number;
  categoryId: number;
  factoryId: number;
  sizeDetails?: Array<{
    size: WearcastSizeString;
    a: number;
    b: number;
    c: number;
  }>;
}

@Injectable({ providedIn: 'root' })
export class FactoryApiService {
  private readonly base = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getCategories(): Observable<CategoryDto[]> {
    const url = `${this.base}/api/Category/GetAllCategories`;
    return this.http.get<CategoryDto[] | ApiEnvelope<CategoryDto[]>>(url).pipe(
      map(body => {
        if (Array.isArray(body)) {
          return body;
        }
        const env = body as ApiEnvelope<CategoryDto[]>;
        if (env && typeof env === 'object' && 'isSuccess' in env) {
          if (!env.isSuccess) {
            throw new Error(env.error?.description || 'Categories failed');
          }
          return (env.data as CategoryDto[]) ?? [];
        }
        return [];
      }),
      catchError(e => this.mapErr(e))
    );
  }

  createFactory(body: FactoryRegisterForm): Observable<{ userManagerId: string }> {
    const url = `${this.base}/api/factories`;
    const fd = new FormData();

    fd.append('ManagerEmail', body.managerEmail);
    fd.append('ManagerFirstName', body.managerFirstName);
    fd.append('ManagerLastName', body.managerLastName);
    fd.append('ManagerPhoneNumber', body.managerPhoneNumber);
    fd.append('ManagerPassword', body.managerPassword);
    fd.append('ManagerConfirmPassword', body.managerConfirmPassword);

    fd.append('FactoryName', body.factoryName);
    fd.append('FactoryEmail', body.factoryEmail);
    fd.append('FactoryPhoneNumber', body.factoryPhoneNumber);
    fd.append(
      'FactoryCommercialRegisterNumber',
      body.factoryCommercialRegisterNumber
    );
    fd.append('FactoryTaxIdNumber', body.factoryTaxIdNumber);
    fd.append('FactoryDescription', body.factoryDescription);
    fd.append('FactoryState', body.factoryState);
    fd.append('FactoryCity', body.factoryCity);
    fd.append('FactoryStreet', body.factoryStreet);
    fd.append('FactoryBuildingNumber', body.factoryBuildingNumber);
    if (body.factoryLogo) {
      fd.append('FactoryLogo', body.factoryLogo, body.factoryLogo.name);
    }

    return this.http.post<ApiEnvelope>(url, fd).pipe(
      map(res => {
        if (!res.isSuccess) {
          throw this.envErr(res);
        }
        const data = res.data as Record<string, unknown> | undefined;
        const raw =
          data?.['userManagerId'] ??
          data?.['UserManagerId'] ??
          data?.['userId'] ??
          data?.['UserId'];
        if (typeof raw !== 'string' || raw.trim().length === 0) {
          throw new Error(
            'Factory created but no userManagerId returned by the API.'
          );
        }
        return { userManagerId: raw.trim() };
      }),
      catchError(e => this.mapErr(e))
    );
  }

  getDesignedProducts(): Observable<{ id: number; name: string }[]> {
    const url = `${this.base}/api/factories/products`;
    return this.http.get<any>(url).pipe(
      map(body => {
        let list: any[] = [];
        if (Array.isArray(body)) {
          list = body;
        } else if (body && typeof body === 'object' && Array.isArray(body.data)) {
          list = body.data;
        } else if (body && typeof body === 'object' && Array.isArray(body.Data)) {
          list = body.Data;
        }
        return list.map(item => {
          const o = item || {};
          const id = o.id ?? o.Id ?? o.productId ?? o.ProductId ?? 0;
          const name = o.name ?? o.Name ?? o.productName ?? o.ProductName ?? o.title ?? o.Title ?? `Designed product #${id}`;
          return { id, name };
        });
      }),
      catchError(e => this.mapErr(e))
    );
  }

  createDesignedProduct(
    payload: CreateDesignedProductPayload
  ): Observable<{ productId: number }> {
    const url = `${this.base}/api/factories/products`;
    return this.http.post<ApiEnvelope>(url, payload).pipe(
      map(body => {
        if (!body.isSuccess) {
          throw this.envErr(body);
        }
        const id = this.extractProductId(body.data);
        if (id == null) {
          throw new Error('Created product but no id in response');
        }
        return { productId: id };
      }),
      catchError(e => this.mapErr(e))
    );
  }

  addProductColor(
    productId: number,
    body: { name: string; hexCode: string }
  ): Observable<{ colorId: number }> {
    const url = `${this.base}/api/factories/products/${productId}/colors`;
    return this.http.post<ApiEnvelope>(url, body).pipe(
      map(res => {
        if (!res.isSuccess) {
          throw this.envErr(res);
        }
        const id = this.extractColorId(res.data);
        if (id == null) {
          throw new Error('Color created but id missing');
        }
        return { colorId: id };
      }),
      catchError(e => this.mapErr(e))
    );
  }

  uploadColorViewImage(
    colorId: number,
    file: File,
    viewSide: number
  ): Observable<void> {
    const url = `${this.base}/api/factories/product-colors/${colorId}/images`;
    const fd = new FormData();
    fd.append('Image', file, file.name);
    fd.append('ViewSide', String(viewSide));
    return this.http.post<ApiEnvelope>(url, fd).pipe(
      map(res => {
        if (!res.isSuccess) {
          throw this.envErr(res);
        }
      }),
      catchError(e => this.mapErr(e))
    );
  }

  addProductSize(
    productId: number,
    body: { size: string; a: number; b: number; c: number }
  ): Observable<void> {
    const url = `${this.base}/api/factories/products/${productId}/sizes`;
    return this.http.post<ApiEnvelope>(url, body).pipe(
      map(res => {
        if (!res.isSuccess) {
          throw this.envErr(res);
        }
      }),
      catchError(e => this.mapErr(e))
    );
  }

  /** DELETE /api/factories/products/{id} */
  deleteDesignedProduct(productId: number): Observable<void> {
    const url = `${this.base}/api/factories/products/${productId}`;
    return this.http.delete<ApiEnvelope | null>(url).pipe(
      map(body => {
        if (
          body &&
          typeof body === 'object' &&
          'isSuccess' in body &&
          !body.isSuccess
        ) {
          throw this.envErr(body);
        }
      }),
      catchError(e => this.mapErr(e))
    );
  }

  private extractProductId(data: unknown): number | null {
    if (typeof data === 'number' && Number.isFinite(data)) {
      return data;
    }
    if (typeof data === 'string' && /^\d+$/.test(data)) {
      return parseInt(data, 10);
    }
    if (!data || typeof data !== 'object') {
      return null;
    }
    const o = data as Record<string, unknown>;
    const v = o['id'] ?? o['Id'] ?? o['productId'] ?? o['ProductId'];
    if (typeof v === 'number' && Number.isFinite(v)) {
      return v;
    }
    if (typeof v === 'string' && /^\d+$/.test(v)) {
      return parseInt(v, 10);
    }
    return null;
  }

  private extractColorId(data: unknown): number | null {
    // Many backends return the created color id under a different property than product id.
    if (typeof data === 'number' && Number.isFinite(data)) {
      return data;
    }
    if (typeof data === 'string' && /^\d+$/.test(data)) {
      return parseInt(data, 10);
    }
    if (!data || typeof data !== 'object') {
      return null;
    }
    const o = data as Record<string, unknown>;
    const v =
      o['colorId'] ??
      o['ColorId'] ??
      o['productColorId'] ??
      o['ProductColorId'] ??
      o['factoryProductColorId'] ??
      o['FactoryProductColorId'] ??
      o['id'] ??
      o['Id'];
    if (typeof v === 'number' && Number.isFinite(v)) {
      return v;
    }
    if (typeof v === 'string' && /^\d+$/.test(v)) {
      return parseInt(v, 10);
    }
    return null;
  }

  private envelopeFailure(body: ApiEnvelope): Error {
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

  private envErr(body: ApiEnvelope): Error {
    return this.envelopeFailure(body);
  }

  private mapErr(err: unknown): Observable<never> {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as ApiEnvelope | Record<string, unknown> | string | null;
      if (body && typeof body === 'object' && 'isSuccess' in body) {
        return throwError(() => this.envelopeFailure(body as ApiEnvelope));
      }
      // ASP.NET ProblemDetails validation format
      if (body && typeof body === 'object' && 'errors' in body) {
        const errors = (body as any).errors as Record<string, string[]>;
        const parts = Object.entries(errors).map(
          ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`
        );
        return throwError(() => new Error(parts.join('; ') || 'Bad request'));
      }
      return throwError(
        () => new Error(err.message || `HTTP ${err.status}`)
      );
    }
    return throwError(() =>
      err instanceof Error ? err : new Error(String(err))
    );
  }
}
