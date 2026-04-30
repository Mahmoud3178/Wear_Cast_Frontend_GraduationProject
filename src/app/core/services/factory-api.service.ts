import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of, throwError, forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/** Matches typical API `ViewSide` enum order used by WearCast. */
export const VIEW_SIDE = {
  // Backend rejects `0` ("The value '0' is invalid"), so use 1-based enum codes.
  Front: 1,
  Back: 2,
  Right: 3,
  Left: 4
} as const;

/** Target Audience Options */
export const TARGET_AUDIENCE_OPTIONS: ReadonlyArray<{
  label: string;
  value: number;
}> = [
  { label: 'Men', value: 1 },
  { label: 'Women', value: 2 },
  { label: 'Unisex', value: 3 },
  { label: 'Kids', value: 4 },
  { label: 'Babies', value: 8 }
];

export const DRESS_STYLE_OPTIONS: ReadonlyArray<{
  label: string;
  value: number;
}> = [
  { label: 'Casual', value: 1 },
  { label: 'Formal', value: 2 },
  { label: 'Party', value: 3 },
  { label: 'Gym', value: 4 },
  { label: 'Sporty', value: 5 }
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

export interface CategoryDetailsDto {
  id: number;
  name: string;
  imageUrl: string | null;
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
  dressStyle: number;
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

export interface FactoryProfile {
  factoryId?: number;
  name: string;
  email: string;
  phoneNumber?: string;
  description?: string;
  address?: {
    country?: string;
    state?: string;
    city?: string;
    street?: string;
    buildingNumber?: string;
  };
  imageUrl?: string;
  logoUrl?: string;
  commercialRegisterNumber?: string;
  taxIdNumber?: string;
  state?: string;
  city?: string;
  street?: string;
  buildingNumber?: string;
  isVerified?: boolean;
}

export interface FactoryManager {
  id: number;
  name: string;
  email: string;
  phoneNumber?: string;
  isActive: boolean;
}

export interface FactoryManagerProfile {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  imageUrl?: string;
}

export interface UpdateFactoryManagerProfileRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  providedManagerId: number;
}

export interface FactoryOrderSummary {
  id: number;
  status: string;
  createdOn: string;
  recipientName: string;
  recipientPhoneNumber: string;
  totalAmount: number;
  itemsCount: number;
}

export interface FactoryOrderItem {
  productName: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  size: string;
}

@Injectable({ providedIn: 'root' })
export class FactoryApiService {
  private readonly base = environment.apiUrl;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService
  ) {}

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

  getCategoryById(categoryId: number): Observable<CategoryDetailsDto | null> {
    const url = `${this.base}/api/Category/GetCategoryById/${categoryId}`;
    return this.http.get<unknown>(url).pipe(
      map(body => {
        const payload = this.unwrapPayload<Record<string, unknown>>(body);
        if (!payload) return null;
        const id = this.toNum(payload['id'] ?? payload['Id']) ?? categoryId;
        const name =
          this.pickString(payload, ['name', 'Name', 'title', 'Title']) ||
          `Category #${id}`;
        const imageUrl =
          this.pickString(payload, [
            'imageUrl',
            'ImageUrl',
            'image',
            'Image',
            'categoryImageUrl',
            'CategoryImageUrl'
          ]) || null;
        return { id, name, imageUrl };
      }),
      catchError(() => of(null))
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

  getDesignedProducts(): Observable<{
    id: number;
    name: string;
    price: number;
    categoryName: string;
    mainImageUrl: string | null;
    targetAudienceLabel: string;
    averageRating: number | null;
    reviewCount: number;
  }[]> {
    // Use factory catalog endpoint to get all products for this factory
    const url = `${this.base}/api/factories/catalog/designed-products`;
    return this.http.get<ApiEnvelope | unknown>(url).pipe(
      map(res => {
        const payload = this.unwrapPayload<any>(res);
        // Handle paginated response: data.items array
        const list = payload?.items ?? payload ?? [];
        if (!Array.isArray(list)) return [];
        return list.map((item: any) => {
          const o = item || {};
          const id = o.id ?? o.Id ?? o.designedProductId ?? o.DesignedProductId ?? o.productId ?? o.ProductId ?? 0;
          const name = o.name ?? o.Name ?? o.productName ?? o.ProductName ?? o.title ?? o.Title ?? `Designed product #${id}`;
          const price = o.price ?? o.Price ?? 0;
          const categoryName = o.categoryName ?? o.CategoryName ?? '';
          const mainImageUrl = o.mainImageUrl ?? o.MainImageUrl ?? null;
          const targetAudienceLabel = this.targetAudienceLabelFromRow(o);
          const averageRatingRaw = this.toNum(o.averageRating ?? o.AverageRating);
          const reviewCountRaw = this.toNum(o.reviewCount ?? o.ReviewCount ?? o.ratingsCount ?? o.RatingsCount) ?? 0;
          return {
            id,
            name,
            price,
            categoryName,
            mainImageUrl,
            targetAudienceLabel,
            averageRating: averageRatingRaw != null ? Number(averageRatingRaw.toFixed(1)) : null,
            reviewCount: Math.max(0, Math.floor(reviewCountRaw))
          };
        });
      }),
      catchError(() => of([]))
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
    body: { name: string; hexCode: string; image: File }
  ): Observable<{ colorId: number }> {
    const url = `${this.base}/api/factories/products/${productId}/colors`;
    const fd = new FormData();
    fd.append('Name', body.name);
    fd.append('HexCode', body.hexCode);
    fd.append('Image', body.image, body.image.name);

    return this.http.post<ApiEnvelope>(url, fd).pipe(
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

  /** PUT /api/factories/designed-product-colors/{colorId}/images/{viewSide}
   *  Replaces an existing view image for a color side (new backend endpoint). */
  replaceColorViewImage(
    colorId: number,
    file: File,
    viewSide: number
  ): Observable<void> {
    const url = `${this.base}/api/factories/designed-product-colors/${colorId}/images/${viewSide}`;
    const fd = new FormData();
    fd.append('NewImage', file, file.name);
    return this.http.put<ApiEnvelope | null>(url, fd).pipe(
      map(res => {
        if (res && typeof res === 'object' && 'isSuccess' in res && !res.isSuccess) {
          throw this.envErr(res as ApiEnvelope);
        }
      }),
      catchError(e => this.mapErr(e))
    );
  }

  /** DELETE /api/factories/product-images/{imageId} — delete a single image */
  deleteProductImage(imageId: number): Observable<void> {
    const url = `${this.base}/api/factories/product-images/${imageId}`;
    return this.http.delete<ApiEnvelope | null>(url).pipe(
      map(body => {
        if (body && typeof body === 'object' && 'isSuccess' in body && !body.isSuccess) {
          throw this.envErr(body as ApiEnvelope);
        }
      }),
      catchError(e => this.mapErr(e))
    );
  }

  uploadColorMainImage(
    productId: number,
    colorId: number,
    file: File
  ): Observable<void> {
    const url = `${this.base}/api/factories/products/${productId}/colors/${colorId}/main-image`;
    const fd = new FormData();
    fd.append('Image', file, file.name);
    return this.http.put<ApiEnvelope>(url, fd).pipe(
      map(res => {
        if (res && res.isSuccess === false) {
          throw this.envErr(res);
        }
      }),
      catchError(e => this.mapErr(e))
    );
  }

  getAllFixedProducts(params: any): Observable<any> {
    const url = `${this.base}/api/FixedProduct/GetAll`;
    return this.http.get(url, { params }).pipe(
      catchError(e => this.mapErr(e))
    );
  }

  /** GET /api/factories/products/{productId}/colors — get all colors for a product. */
  getProductColors(productId: number): Observable<{ colorId: number; name: string; hexCode: string; imageUrl: string | null }[]> {
    const url = `${this.base}/api/factories/products/${productId}/colors`;
    console.log('Fetching colors from:', url);
    return this.http.get<ApiEnvelope | any>(url).pipe(
      map(res => {
        console.log('Colors API response:', res);
        const list = this.unwrapPayload<any[]>(res) ?? [];
        console.log('Extracted colors list:', list);
        const mapped = list.map(c => ({
          colorId: c.id ?? c.colorId ?? c.Id ?? c.ColorId ?? 0,
          name: c.name ?? c.Name ?? '',
          hexCode: c.hexCode ?? c.HexCode ?? '',
          imageUrl: c.imageUrl ?? c.ImageUrl ?? c.image ?? c.Image ?? null
        }));
        console.log('Mapped colors:', mapped);
        return mapped;
      }),
      catchError(err => {
        console.error('Failed to load colors:', err);
        return of([]);
      })
    );
  }

  /** PUT /api/factories/products/{productId} — update product including default color. */
  updateDesignedProduct(
    productId: number,
    body: {
      name?: string;
      description?: string;
      price?: number;
      targetAudiences?: string[];
      dressStyle?: number;
      canvasWidth?: number;
      canvasHeight?: number;
      categoryId?: number;
      defaultColorId?: number | null;
    }
  ): Observable<{ message: string }> {
    const url = `${this.base}/api/factories/products/${productId}`;
    return this.http.put<ApiEnvelope>(url, body).pipe(
      map(res => {
        if (!res.isSuccess) {
          throw this.envErr(res);
        }
        return { message: 'Product updated successfully' };
      }),
      catchError(e => this.mapErr(e))
    );
  }

  /** POST /api/factory-managers — create a new factory manager account. */
  createFactoryManager(body: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    password: string;
    confirmPassword: string;
    providedFactoryId?: number;
  }): Observable<{ message: string; userId?: string }> {
    const url = `${this.base}/api/factory-managers`;
    return this.http.post<ApiEnvelope>(url, body).pipe(
      map(res => {
        if (!res.isSuccess) {
          throw this.envErr(res);
        }
        // Extract userManagerId from response (for email confirmation)
        const payload = (res.data ?? {}) as Record<string, unknown>;
        const userId = (payload['userManagerId'] ?? payload['UserManagerId'] ?? '').toString();
        return { message: 'Factory manager created successfully', userId: userId || undefined };
      }),
      catchError(e => this.mapErr(e))
    );
  }

  /** GET /api/factories/profile — get factory profile */
  getFactoryProfile(): Observable<FactoryProfile> {
    const url = `${this.base}/api/factories/profile`;
    return this.http.get<ApiEnvelope<FactoryProfile> | FactoryProfile>(url).pipe(
      map(res => {
        const payload = this.unwrapPayload<FactoryProfile>(res);
        if (!payload) {
          throw new Error('Failed to load factory profile');
        }
        return {
          ...payload,
          // Backend currently returns logoUrl for factory profile image.
          imageUrl: payload.imageUrl || payload.logoUrl
        };
      }),
      catchError(e => this.mapErr(e))
    );
  }

  /** PUT /api/factories/profile — update factory profile */
  updateFactoryProfile(body: Partial<FactoryProfile>): Observable<void> {
    const url = `${this.base}/api/factories/profile`;
    return this.http.put<ApiEnvelope>(url, body).pipe(
      map(res => {
        if (res && typeof res === 'object' && 'isSuccess' in res && !res.isSuccess) {
          throw this.envErr(res);
        }
      }),
      catchError(e => this.mapErr(e))
    );
  }

  /** PUT /api/factories/profile-image — update factory profile image */
  updateFactoryProfileImage(file: File): Observable<void> {
    const url = `${this.base}/api/factories/profile-image`;
    const formData = new FormData();
    formData.append('NewLogo', file);
    const factoryId = this.auth.getFactoryId();
    if (factoryId) {
      formData.append('ProvidedFactoryId', factoryId.toString());
    }
    return this.http.put<ApiEnvelope>(url, formData).pipe(
      map(res => {
        if (res && typeof res === 'object' && 'isSuccess' in res && !res.isSuccess) {
          throw this.envErr(res);
        }
      }),
      catchError(e => this.mapErr(e))
    );
  }

  /** GET /api/factory-managers — list factory managers */
  getFactoryManagers(): Observable<FactoryManager[]> {
    const url = `${this.base}/api/factory-managers`;
    return this.http.get<ApiEnvelope<FactoryManager[]> | FactoryManager[]>(url).pipe(
      map(res => {
        const list = this.unwrapPayload<FactoryManager[]>(res);
        return list ?? [];
      }),
      catchError(() => of([]))
    );
  }

  /** GET /api/factory-managers/profile */
  getFactoryManagerProfile(): Observable<FactoryManagerProfile> {
    const url = `${this.base}/api/factory-managers/profile`;
    return this.http
      .get<ApiEnvelope<FactoryManagerProfile> | FactoryManagerProfile>(url)
      .pipe(
        map(res => {
          const payload = this.unwrapPayload<FactoryManagerProfile>(res);
          if (!payload) {
            throw new Error('Failed to load manager profile');
          }
          return payload;
        }),
        catchError(e => this.mapErr(e))
      );
  }

  /** PUT /api/factory-managers/profile */
  updateFactoryManagerProfile(body: UpdateFactoryManagerProfileRequest): Observable<void> {
    const url = `${this.base}/api/factory-managers/profile`;
    return this.http.put<ApiEnvelope | null>(url, body).pipe(
      map(res => {
        if (res && typeof res === 'object' && 'isSuccess' in res && !res.isSuccess) {
          throw this.envErr(res as ApiEnvelope);
        }
      }),
      catchError(e => this.mapErr(e))
    );
  }

  /** GET /api/Orders/GetAllByID — list orders for current factory account. */
  getFactoryOrders(
    pageNumber = 1,
    pageSize = 50
  ): Observable<FactoryOrderSummary[]> {
    const url = `${this.base}/api/Orders/GetAllByID`;
    const factoryId = this.auth.getFactoryId();
    let params = new HttpParams()
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));
    if (factoryId != null) {
      params = params
        .set('factoryId', String(factoryId))
        .set('providedFactoryId', String(factoryId));
    }
    return this.http.get<unknown>(url, { params }).pipe(
      map(res => {
        const payload = this.unwrapPayload<any>(res);
        const list = payload?.items ?? payload?.data ?? payload ?? [];
        if (!Array.isArray(list)) return [];
        return list.map((row: any) => ({
          id: this.toNum(row?.id ?? row?.Id ?? row?.orderId ?? row?.OrderId) ?? 0,
          status: this.pickString(row ?? {}, ['status', 'Status']) || 'Unknown',
          createdOn:
            this.pickString(row ?? {}, ['createdOn', 'CreatedOn', 'createdAt', 'CreatedAt']) || '',
          recipientName:
            this.pickString(row ?? {}, ['recipientName', 'RecipientName']) || 'Customer',
          recipientPhoneNumber:
            this.pickString(row ?? {}, ['recipientPhoneNumber', 'RecipientPhoneNumber']) || '',
          totalAmount:
            this.toNum(
              row?.totalAmount ?? row?.TotalAmount ?? row?.amount ?? row?.Amount
            ) ?? 0,
          itemsCount:
            this.toNum(
              row?.itemsCount ??
                row?.ItemsCount ??
                (Array.isArray(row?.items) ? row.items.length : null)
            ) ?? 0
        }));
      }),
      catchError(() => of([]))
    );
  }

  /** GET /api/Orders/{orderId}/items — list order items. */
  getFactoryOrderItems(orderId: number): Observable<FactoryOrderItem[]> {
    const url = `${this.base}/api/Orders/${orderId}/items`;
    return this.http.get<unknown>(url).pipe(
      map(res => {
        const payload = this.unwrapPayload<any>(res);
        const list = payload?.items ?? payload?.data ?? payload ?? [];
        if (!Array.isArray(list)) return [];
        return list.map((row: any) => ({
          productName:
            this.pickString(row ?? {}, [
              'productName',
              'ProductName',
              'name',
              'Name'
            ]) || 'Item',
          imageUrl:
            this.pickString(row ?? {}, ['imageUrl', 'ImageUrl', 'productImage', 'ProductImage']) ||
            null,
          quantity: this.toNum(row?.quantity ?? row?.Quantity) ?? 0,
          unitPrice: this.toNum(row?.unitPrice ?? row?.UnitPrice ?? row?.price ?? row?.Price) ?? 0,
          totalPrice:
            this.toNum(row?.totalPrice ?? row?.TotalPrice) ??
            (this.toNum(row?.quantity ?? row?.Quantity) ?? 0) *
              (this.toNum(row?.unitPrice ?? row?.UnitPrice ?? row?.price ?? row?.Price) ?? 0),
          size: this.pickString(row ?? {}, ['size', 'Size']) || '-'
        }));
      }),
      catchError(() => of([]))
    );
  }

  addProductSize(
    productId: number,
    body: { size: string; a: number; b: number; c: number }
  ): Observable<{ id?: number }> {
    const url = `${this.base}/api/factories/products/${productId}/sizes`;
    return this.http.post<ApiEnvelope>(url, body).pipe(
      map(res => {
        if (!res.isSuccess) {
          throw this.envErr(res);
        }
        const data = (res.data ?? {}) as Record<string, unknown>;
        const id = this.toNum(data['id'] ?? data['Id'] ?? data['sizeId'] ?? data['SizeId']) ?? undefined;
        return { id };
      }),
      catchError(e => this.mapErr(e))
    );
  }

  /** PUT /api/factories/product-sizes/{Id} */
  updateProductSize(
    sizeId: number,
    body: { size: string; a: number; b: number; c: number }
  ): Observable<void> {
    const url = `${this.base}/api/factories/product-sizes/${sizeId}`;
    return this.http.put<ApiEnvelope | null>(url, body).pipe(
      map(res => {
        if (res && typeof res === 'object' && 'isSuccess' in res && !res.isSuccess) {
          throw this.envErr(res as ApiEnvelope);
        }
      }),
      catchError(e => this.mapErr(e))
    );
  }

  /** DELETE /api/factories/product-sizes/{Id} */
  deleteProductSize(sizeId: number): Observable<void> {
    const url = `${this.base}/api/factories/product-sizes/${sizeId}`;
    return this.http.delete<ApiEnvelope | null>(url).pipe(
      map(res => {
        if (res && typeof res === 'object' && 'isSuccess' in res && !res.isSuccess) {
          throw this.envErr(res as ApiEnvelope);
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

  /** DELETE /api/factories/products/{productId}/colors/{colorId} */
  deleteProductColor(productId: number, colorId: number): Observable<void> {
    const url = `${this.base}/api/factories/products/${productId}/colors/${colorId}`;
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

  /** Unwrap payload from envelope or return raw if already unwrapped */
  private unwrapPayload<T>(res: ApiEnvelope<T> | T | null | unknown): T | null {
    if (!res || typeof res !== 'object') {
      return null;
    }
    const o = res as Record<string, unknown>;
    // If it's an envelope, unwrap data/Data
    if ('isSuccess' in o) {
      if (o['isSuccess'] === false) {
        return null;
      }
      const inner = o['data'] ?? o['Data'];
      return inner as T ?? null;
    }
    // Otherwise assume it's already the payload
    return res as T;
  }

  private pickString(obj: Record<string, unknown>, keys: string[]): string {
    for (const k of keys) {
      const v = obj[k];
      if (typeof v === 'string' && v.trim()) {
        return v.trim();
      }
    }
    return '';
  }

  private toNum(v: unknown): number | null {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) return parseFloat(v);
    return null;
  }

  private targetAudienceLabel(v: unknown): string {
    if (typeof v === 'string' && v.trim()) return v.trim();
    const n = this.toNum(v);
    if (n == null) return 'All';
    const map: Record<number, string> = {
      1: 'Men',
      2: 'Women',
      3: 'Unisex',
      4: 'Kids',
      8: 'Babies'
    };
    return map[Math.floor(n)] ?? 'All';
  }

  private targetAudienceLabelFromRow(row: Record<string, unknown>): string {
    const single =
      row['targetAudienceName'] ??
      row['TargetAudienceName'] ??
      row['targetAudience'] ??
      row['TargetAudience'];
    if (single != null) {
      return this.targetAudienceLabel(single);
    }
    const many =
      row['targetAudiences'] ??
      row['TargetAudiences'] ??
      row['audiences'] ??
      row['Audiences'];
    if (Array.isArray(many) && many.length > 0) {
      const labels = many
        .map(v => this.targetAudienceLabel(v))
        .filter(v => !!v && v !== 'All');
      if (labels.length > 0) {
        return [...new Set(labels)].join(', ');
      }
    }
    return 'All';
  }
}
