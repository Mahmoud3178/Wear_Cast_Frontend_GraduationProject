import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

function cartHttpObservable<T>(obs: Observable<T>): Observable<T> {
  return obs.pipe(catchError(err => throwError(() => new Error(cartHttpMessage(err)))));
}

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
  /** Backend cart field (note the “Designed” spelling). */
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
      const description = o['description'];
      if (typeof description === 'string' && description.trim()) {
        return description.trim();
      }
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
    return this.http.get<unknown>(`${this.base}/GetDesignsInCart`).pipe(
      map(body => normalizeCartDesignItems(body))
    );
  }

  /** DELETE /api/Cart/DeleteCartItem/{CartItemId} */
  deleteItem(cartItemId: number): Observable<unknown> {
    return this.http.delete(`${this.base}/DeleteCartItem/${cartItemId}`);
  }

  /** PUT /api/Cart/UpdateItemQuantity */
  updateItemQuantity(cartItemId: number, size: number, newQuantity: number): Observable<unknown> {
    const body = {
      cartItemId,
      CartItemId: cartItemId,
      size,
      Size: size,
      newQuantity,
      NewQuantity: newQuantity
    };
    return cartHttpObservable(
      this.http.put<unknown>(`${this.base}/UpdateItemQuantity`, body)
    );
  }

  /** POST /api/Cart/AddOrUpdateFixedColorToCart */
  addOrUpdateFixed(req: AddOrUpdateFixedColorToCartRequest): Observable<unknown> {
    const sizes = (req.sizes ?? []).map(s => ({
      size: s.size,
      Size: s.size,
      quantity: s.quantity,
      Quantity: s.quantity
    }));
    const body: Record<string, unknown> = {
      colorId: req.colorId,
      ColorId: req.colorId,
      sizes,
      Sizes: sizes
    };
    return cartHttpObservable(
      this.http.post<unknown>(`${this.base}/AddOrUpdateFixedColorToCart`, body)
    );
  }

  /** POST /api/Cart/AddOrUpdateDesignedToCart — OpenAPI requires `sizes: [{ size, quantity }]`. */
  addOrUpdateDesigned(req: AddOrUpdateDesignedToCartRequest): Observable<unknown> {
    const sizes: SizeQuantityItem[] = [
      { size: req.size, quantity: req.quantity }
    ];
    const body = {
      designId: req.designId,
      DesignId: req.designId,
      size: req.size,
      Size: req.size,
      quantity: req.quantity,
      Quantity: req.quantity,
      sizes,
      Sizes: sizes
    };
    return cartHttpObservable(
      this.http.post<unknown>(`${this.base}/AddOrUpdateDesignedToCart`, body)
    );
  }
}

/** Accept raw array or `{ data | items | Data | Items }` envelope from the cart API. */
function normalizeCartDesignItems(body: unknown): CartDesignItem[] {
  if (Array.isArray(body)) {
    return body as CartDesignItem[];
  }
  if (!body || typeof body !== 'object') {
    return [];
  }
  const o = body as Record<string, unknown>;
  if ('isSuccess' in o && o['isSuccess'] === false) {
    return [];
  }
  const inner =
    o['data'] ??
    o['Data'] ??
    o['items'] ??
    o['Items'] ??
    o['designs'] ??
    o['Designs'];
  if (Array.isArray(inner)) {
    return inner as CartDesignItem[];
  }
  return [];
}
