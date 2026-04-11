import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AddCustomerDesignRequest {
  viewDesignsJson: string;
  productId: number;
  productColorId: number;
}

interface ApiEnvelope<T = unknown> {
  isSuccess: boolean;
  data?: T;
  error?: { code: string; description: string };
  validationErrors?: Record<string, string | string[]>;
}

@Injectable({ providedIn: 'root' })
export class CustomerDesignService {
  private readonly base = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  /** POST /api/customers/me/designs — persists customer artwork on a designed product color. Returns created design id when the API sends one. */
  saveDesign(body: AddCustomerDesignRequest): Observable<number | null> {
    const url = `${this.base}/api/customers/me/designs`;
    const fd = new FormData();
    fd.append('ProductId', body.productId.toString());
    fd.append('ProductColorId', body.productColorId.toString());
    fd.append('ViewDesignsJson', body.viewDesignsJson);

    return this.http.post<unknown>(url, fd).pipe(
      map(raw => {
        if (raw && typeof raw === 'object' && 'isSuccess' in raw) {
          const res = raw as ApiEnvelope;
          if (!res.isSuccess) {
            throw new Error(res.error?.description || 'Save design failed');
          }
          return this.extractDesignId(res.data);
        }
        return this.extractDesignId(raw);
      }),
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse) {
          const b = err.error as ApiEnvelope | Record<string, unknown> | null;
          if (b && typeof b === 'object' && 'isSuccess' in b && !(b as ApiEnvelope).isSuccess) {
            const e = (b as ApiEnvelope).error?.description;
            return throwError(() => new Error(e || err.message || `HTTP ${err.status}`));
          }
          if (b && typeof b === 'object' && 'detail' in b && typeof (b as any).detail === 'string') {
            return throwError(() => new Error((b as any).detail));
          }
          return throwError(() => new Error(err.message || `HTTP ${err.status}`));
        }
        return throwError(() =>
          err instanceof Error ? err : new Error(String(err))
        );
      })
    );
  }

  private extractDesignId(data: unknown): number | null {
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
      o['id'] ??
      o['Id'] ??
      o['designId'] ??
      o['DesignId'] ??
      o['customerDesignId'] ??
      o['CustomerDesignId'];
    if (typeof v === 'number' && Number.isFinite(v)) {
      return v;
    }
    if (typeof v === 'string' && /^\d+$/.test(v)) {
      return parseInt(v, 10);
    }
    return null;
  }
}
