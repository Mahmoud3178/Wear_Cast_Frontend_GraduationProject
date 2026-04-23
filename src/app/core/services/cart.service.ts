import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// ────────────────────────────────────────────────────────
//  Response models (inferred from swagger + API patterns)
// ────────────────────────────────────────────────────────

export interface CartFixedItem {
  cartItemId: number;
  productId: number;
  colorId: number;
  productName: string;
  colorName: string;
  colorCode: string;
  imageUrl: string;
  price: number;
  size: string;
  quantity: number;
}

export interface CartDesignItem {
  cartItemId: number;
  customerDesignedId?: number;
  designId?: number;
  designName?: string;
  productName?: string;
  imageUrl?: string;
  image?: string;
  price: number;
  size?: string;
  quantity?: number;
  // API returns sizes array with nested size and quantityInCart
  sizes?: Array<{
    size: string;
    quantityInCart: number;
  }>;
}

// ────────────────────────────────────────────────────────
//  Request models (from swagger schemas)
// ────────────────────────────────────────────────────────

export interface SizeQuantityItem {
  size: number;     // Size enum integer (e.g. _M=14, _L=15)
  quantity: number;
}

export interface AddOrUpdateFixedColorToCartRequest {
  colorId: number;
  sizes: SizeQuantityItem[];  // API requires sizes[] not a single size
}

export interface AddOrUpdateDesignedToCartRequest {
  designId: number;
  size: number;   // Size enum integer
  quantity: number;
}

// ────────────────────────────────────────────────────────
//  Service
// ────────────────────────────────────────────────────────

function cartHttpMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const b = err.error;
    if (b && typeof b === 'object') {
      const o = b as Record<string, unknown>;
      const detail = o['detail'];
      if (typeof detail === 'string' && detail.trim()) {
        return detail.trim();
      }
      const title = o['title'];
      if (typeof title === 'string' && title.trim()) {
        return title.trim();
      }
      const errs = o['errors'];
      if (errs && typeof errs === 'object') {
        const parts = Object.entries(errs as Record<string, unknown>).map(
          ([k, v]) =>
            `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`
        );
        if (parts.length) {
          return parts.join('; ');
        }
      }
      const msg = o['message'];
      if (typeof msg === 'string' && msg.trim()) {
        return msg.trim();
      }
      const errObj = o['error'];
      if (errObj && typeof errObj === 'object') {
        const desc = (errObj as Record<string, unknown>)['description'];
        if (typeof desc === 'string' && desc.trim()) {
          return desc.trim();
        }
      }
    }
    if (typeof b === 'string' && b.trim()) {
      return b.trim();
    }
    return err.message || `HTTP ${err.status}`;
  }
  return err instanceof Error ? err.message : String(err);
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly base = '/api/Cart';

  constructor(private readonly http: HttpClient) {}

  /** GET /api/Cart/GetFixedColorInCart */
  getFixedItems(): Observable<CartFixedItem[]> {
    return this.http.get<CartFixedItem[]>(`${this.base}/GetFixedColorInCart`);
  }

  /** GET /api/Cart/GetDesignsInCart */
  getDesignItems(): Observable<CartDesignItem[]> {
    return this.http.get<CartDesignItem[]>(`${this.base}/GetDesignsInCart`);
  }

  /** DELETE /api/Cart/DeleteCartItem/{CartItemId} */
  deleteItem(cartItemId: number): Observable<unknown> {
    return this.http.delete(`${this.base}/DeleteCartItem/${cartItemId}`);
  }

  /** POST /api/Cart/AddOrUpdateFixedColorToCart */
  addOrUpdateFixed(req: AddOrUpdateFixedColorToCartRequest): Observable<unknown> {
    // Send both camelCase and PascalCase to handle different binder configs
    const body = {
      colorId: req.colorId,
      ColorId: req.colorId,
      sizes: req.sizes,
      Sizes: req.sizes
    };
    return this.http
      .post(`${this.base}/AddOrUpdateFixedColorToCart`, body)
      .pipe(
        catchError(err => throwError(() => new Error(cartHttpMessage(err))))
      );
  }

  /** POST /api/Cart/AddOrUpdateDesignedToCart */
  addOrUpdateDesigned(req: AddOrUpdateDesignedToCartRequest): Observable<unknown> {
    // Some backends bind only PascalCase fields; send both to be safe.
    const body = {
      designId: req.designId,
      DesignId: req.designId,
      customerDesignId: req.designId,
      CustomerDesignId: req.designId,
      size: req.size,
      Size: req.size,
      quantity: req.quantity,
      Quantity: req.quantity
    };
    return this.http
      .post(`${this.base}/AddOrUpdateDesignedToCart`, body)
      .pipe(
        catchError(err => throwError(() => new Error(cartHttpMessage(err))))
      );
  }
}
