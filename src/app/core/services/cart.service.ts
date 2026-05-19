import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';

export const CART_UPDATED_EVENT = 'cart-updated';

export function dispatchCartUpdated(cart?: MyCartResponse): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail: cart ?? null }));
}

function cartHttpObservable<T>(obs: Observable<T>): Observable<T> {
  return obs.pipe(catchError(err => throwError(() => new Error(cartHttpMessage(err)))));
}

// ────────────────────────────────────────────────────────
//  Cart models (GET /api/Cart/GetMyCart)
// ────────────────────────────────────────────────────────

export interface CartSizeLine {
  size: string;
  quantityInCart: number;
  quantityAvailable?: number;
}

export interface CartFixedLineItem {
  unavailable: boolean;
  cartItemId: number;
  productId: number;
  productColorId: number;
  productName: string;
  price: number;
  image: string;
  sizes: CartSizeLine[];
  totalQuantity: number;
}

export interface CartDesignedLineItem {
  unavailable: boolean;
  cartItemId: number;
  customerDesignedId: number;
  productName: string;
  price: number;
  priceDescription?: string;
  image: string;
  sizes: CartSizeLine[];
  totalQuantity: number;
}

export interface MyCartResponse {
  fixedItems: CartFixedLineItem[];
  designedItems: CartDesignedLineItem[];
  subTotal: number;
  deliveryFee: number;
  grandTotal: number;
}

/** @deprecated Use CartFixedLineItem from GetMyCart */
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

/** @deprecated Use CartDesignedLineItem from GetMyCart */
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
  sizes?: Array<{
    size: string;
    quantityInCart: number;
  }>;
}

// ────────────────────────────────────────────────────────
//  Request models (from swagger schemas)
// ────────────────────────────────────────────────────────

export interface SizeQuantityItem {
  size: number;
  quantity: number;
}

export interface AddOrUpdateFixedColorToCartRequest {
  colorId: number;
  sizes: SizeQuantityItem[];
}

export interface AddOrUpdateDesignedToCartRequest {
  designId: number;
  size: number;
  quantity: number;
}

export interface UpdateItemQuantityRequest {
  cartItemId: number;
  size: string;
  quantityChange: number;
}

// ────────────────────────────────────────────────────────
//  Service
// ────────────────────────────────────────────────────────

function cartHttpMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const b = err.error;
    if (b && typeof b === 'object') {
      const o = b as Record<string, unknown>;
      const validation = o['validationErrors'] ?? o['ValidationErrors'];
      if (validation && typeof validation === 'object') {
        const parts = Object.entries(validation as Record<string, unknown>).map(
          ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`
        );
        if (parts.length) return parts.join('; ');
      }
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
        if (parts.length) return parts.join('; ');
      }
      const msg = o['message'] ?? o['Message'];
      if (typeof msg === 'string' && msg.trim()) {
        return msg.trim();
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
  private readonly cart$ = new BehaviorSubject<MyCartResponse | null>(null);
  private inFlight: Observable<MyCartResponse> | null = null;

  constructor(private readonly http: HttpClient) {}

  /** Shared cart snapshot (updated after each successful fetch). */
  readonly cartChanges$ = this.cart$.asObservable();

  getCachedCart(): MyCartResponse | null {
    return this.cart$.value;
  }

  getCartItemCount(cart: MyCartResponse | null = this.cart$.value): number {
    if (!cart) return 0;
    const fixed = cart.fixedItems.reduce((s, f) => s + (f.totalQuantity || 0), 0);
    const design = cart.designedItems.reduce((s, d) => s + (d.totalQuantity || 0), 0);
    return fixed + design;
  }

  /**
   * GET /api/Cart/GetMyCart — deduplicated: one HTTP request shared by nav + cart page.
   * Pass `forceRefresh` after mutations.
   */
  getMyCart(forceRefresh = false): Observable<MyCartResponse> {
    if (!forceRefresh && this.cart$.value) {
      return of(this.cart$.value);
    }
    if (!forceRefresh && this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = this.http.get<unknown>(`${this.base}/GetMyCart`).pipe(
      map(body => normalizeMyCart(body)),
      tap(cart => {
        this.cart$.next(cart);
        this.inFlight = null;
      }),
      catchError(err => {
        this.inFlight = null;
        return throwError(() => new Error(cartHttpMessage(err)));
      }),
      shareReplay(1)
    );
    return this.inFlight;
  }

  invalidateCart(): void {
    this.cart$.next(null);
    this.inFlight = null;
  }

  /** DELETE /api/Cart/DeleteCartItem/{CartItemId} */
  deleteItem(cartItemId: number): Observable<unknown> {
    return this.http.delete(`${this.base}/DeleteCartItem/${cartItemId}`).pipe(
      tap(() => this.invalidateCart())
    );
  }

  /**
   * PUT /api/Cart/UpdateItemQuantity — returns updated cart (all items + totals).
   * @param size API size key e.g. `_XS`, `_L`
   * @param quantityChange `1` for +, `-1` for −
   */
  updateItemQuantity(
    cartItemId: number,
    size: string,
    quantityChange: number
  ): Observable<MyCartResponse> {
    const sizeKey = normalizeSizeForApi(size);
    const delta = quantityChange > 0 ? 1 : -1;
    const body: UpdateItemQuantityRequest = {
      cartItemId,
      size: sizeKey,
      quantityChange: delta
    };
    return cartHttpObservable(
      this.http.put<unknown>(`${this.base}/UpdateItemQuantity`, body).pipe(
        map(res => normalizeMyCart(res)),
        tap(cart => {
          this.cart$.next(cart);
          this.inFlight = null;
        })
      )
    );
  }

  /** Apply cart snapshot from an API response (e.g. after update quantity). */
  setCartSnapshot(cart: MyCartResponse): void {
    this.cart$.next(cart);
    this.inFlight = null;
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
      this.http.post<unknown>(`${this.base}/AddOrUpdateFixedColorToCart`, body).pipe(
        tap(() => this.invalidateCart())
      )
    );
  }

  /** POST /api/Cart/AddOrUpdateDesignedToCart */
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
      this.http.post<unknown>(`${this.base}/AddOrUpdateDesignedToCart`, body).pipe(
        tap(() => this.invalidateCart())
      )
    );
  }
}

function normalizeMyCart(body: unknown): MyCartResponse {
  const empty: MyCartResponse = {
    fixedItems: [],
    designedItems: [],
    subTotal: 0,
    deliveryFee: 0,
    grandTotal: 0
  };
  if (!body || typeof body !== 'object') return empty;

  let root = body as Record<string, unknown>;
  if ('isSuccess' in root && root['isSuccess'] === false) {
    return empty;
  }
  const inner = root['data'] ?? root['Data'];
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    root = inner as Record<string, unknown>;
  }

  const fixedRaw = root['fixedItems'] ?? root['FixedItems'] ?? [];
  const designedRaw = root['designedItems'] ?? root['DesignedItems'] ?? [];

  return {
    fixedItems: normalizeFixedLines(fixedRaw),
    designedItems: normalizeDesignedLines(designedRaw),
    subTotal: num(root['subTotal'] ?? root['SubTotal']),
    deliveryFee: num(root['deliveryFee'] ?? root['DeliveryFee']),
    grandTotal: num(root['grandTotal'] ?? root['GrandTotal'])
  };
}

function normalizeFixedLines(raw: unknown): CartFixedLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(row => {
    const o = row as Record<string, unknown>;
    const sizes = normalizeSizeLines(o['sizes'] ?? o['Sizes']);
    return {
      unavailable: Boolean(o['unavailable'] ?? o['Unavailable']),
      cartItemId: num(o['cartItemId'] ?? o['CartItemId']),
      productId: num(o['productId'] ?? o['ProductId']),
      productColorId: num(o['productColorId'] ?? o['ProductColorId'] ?? o['colorId'] ?? o['ColorId']),
      productName: str(o['productName'] ?? o['ProductName'], 'Product'),
      price: num(o['price'] ?? o['Price']),
      image: str(o['image'] ?? o['Image'] ?? o['imageUrl'] ?? o['ImageUrl'], ''),
      sizes,
      totalQuantity: num(o['totalQuantity'] ?? o['TotalQuantity']) || sumQty(sizes)
    };
  }).filter(i => i.cartItemId > 0);
}

function normalizeDesignedLines(raw: unknown): CartDesignedLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(row => {
    const o = row as Record<string, unknown>;
    const sizes = normalizeSizeLines(o['sizes'] ?? o['Sizes']);
    return {
      unavailable: Boolean(o['unavailable'] ?? o['Unavailable']),
      cartItemId: num(o['cartItemId'] ?? o['CartItemId']),
      customerDesignedId: num(
        o['customerDesignedId'] ?? o['CustomerDesignedId'] ?? o['designId'] ?? o['DesignId']
      ),
      productName: str(o['productName'] ?? o['ProductName'] ?? o['designName'] ?? o['DesignName'], 'Custom Design'),
      price: num(o['price'] ?? o['Price']),
      priceDescription: str(o['priceDescription'] ?? o['PriceDescription'], '') || undefined,
      image: str(o['image'] ?? o['Image'] ?? o['imageUrl'] ?? o['ImageUrl'], ''),
      sizes,
      totalQuantity: num(o['totalQuantity'] ?? o['TotalQuantity']) || sumQty(sizes)
    };
  }).filter(i => i.cartItemId > 0);
}

function normalizeSizeLines(raw: unknown): CartSizeLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(s => {
      const o = s as Record<string, unknown>;
      const size = str(o['size'] ?? o['Size'], '');
      const quantityInCart = num(
        o['quantityInCart'] ?? o['QuantityInCart'] ?? o['quantity'] ?? o['Quantity']
      );
      const quantityAvailable = o['quantityAvailable'] ?? o['QuantityAvailable'];
      return {
        size,
        quantityInCart,
        quantityAvailable:
          quantityAvailable != null ? num(quantityAvailable) : undefined
      };
    })
    .filter(s => s.size && s.quantityInCart > 0);
}

function str(v: unknown, fallback: string): string {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return fallback;
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
}

function sumQty(sizes: CartSizeLine[]): number {
  return sizes.reduce((s, x) => s + x.quantityInCart, 0);
}

/** Ensure size matches API format (`_XS`, `_L`, …). */
export function normalizeSizeForApi(size: string | undefined | null): string {
  const raw = String(size ?? '').trim();
  if (!raw) return '_M';
  const upper = raw.toUpperCase();
  if (upper.startsWith('_')) return upper;
  return `_${upper}`;
}
