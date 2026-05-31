import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError, forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { normalizeWearCastApiDateToIso } from '../utils/api-date';

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

export interface FactoryWalletTransaction {
  type: string;
  amount: number;
  description: string;
  referenceOrderId?: number | null;
  senderName?: string;
  senderEmail?: string;
  createdOn: string;
}

export interface FactoryWalletSummary {
  balance: number;
  recentTransactions: FactoryWalletTransaction[];
}

export interface UpdateFactoryManagerProfileRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  providedManagerId?: number;
}

export interface FactoryOrderSummary {
  id: number;
  status: string;
  createdOn: string;
  recipientName: string;
  recipientPhoneNumber: string;
  totalAmount: number;
  itemsCount: number;
  totalOrderItems?: number; // From GetAllByID API response
}

export interface FactoryOrderItem {
  kind: 'fixed' | 'designed';
  designedProductId?: number;
  customerDesignId?: number;
  productName: string;
  colorName?: string;
  imageUrl: string | null;
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  rightImageUrl?: string | null;
  leftImageUrl?: string | null;
  galleryImageUrls: string[];
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  size: string;
  raw?: Record<string, unknown>;
}

/** Single row from GET `/api/factories/catalog/designed-products` */
export interface FactoryDesignedCatalogItem {
  id: number;
  name: string;
  price: number;
  categoryName: string;
  mainImageUrl: string | null;
  targetAudienceLabel: string;
  averageRating: number | null;
  reviewCount: number;
}

/** Query params per Swagger `/api/factories/catalog/designed-products` */
export interface FactoryDesignedCatalogQuery {
  searchTerm?: string | null;
  categoryId?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  dressStyle?: number | null;
  targetAudiences?: number | null;
  sortBy?: string | null;
  pageIndex?: number;
  pageSize?: number;
}

export interface FactoryDesignedCatalogPage {
  items: FactoryDesignedCatalogItem[];
  pageIndex: number;
  pageSize: number;
  pages: number;
  records: number;
}

export interface FactoryOrdersPage {
  orders: FactoryOrderSummary[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
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

  /**
   * GET `/api/factories/catalog/designed-products` — full query + paging (Swagger).
   */
  getDesignedProductsCatalog(
    query: FactoryDesignedCatalogQuery = {}
  ): Observable<FactoryDesignedCatalogPage> {
    const url = `${this.base}/api/factories/catalog/designed-products`;
    let params = new HttpParams()
      .set('PageIndex', String(query.pageIndex ?? 1))
      .set('PageSize', String(query.pageSize ?? 12));
    const st = query.searchTerm?.trim();
    if (st) params = params.set('SearchTerm', st);
    if (query.categoryId != null && query.categoryId > 0) {
      params = params.set('CategoryId', String(query.categoryId));
    }
    if (query.minPrice != null && query.minPrice > 0) {
      params = params.set('MinPrice', String(query.minPrice));
    }
    if (query.maxPrice != null && query.maxPrice > 0) {
      params = params.set('MaxPrice', String(query.maxPrice));
    }
    if (query.dressStyle != null && Number.isFinite(query.dressStyle)) {
      params = params.set('DressStyle', String(query.dressStyle));
    }
    if (query.targetAudiences != null && Number.isFinite(query.targetAudiences)) {
      params = params.set('TargetAudiences', String(query.targetAudiences));
    }
    if (typeof query.sortBy === 'string' && query.sortBy.trim()) {
      params = params.set('SortBy', query.sortBy.trim());
    }

    return this.http.get<ApiEnvelope | unknown>(url, { params }).pipe(
      map(res => {
        const payload = this.unwrapPayload<any>(res) ?? res ?? {};
        const box = Array.isArray(payload) ? ({ items: payload } as Record<string, unknown>) : payload;
        const list = (box.items ?? box.Items ?? box.data ?? []) as unknown;
        const rows = Array.isArray(list) ? list : [];
        const pi = Number(query.pageIndex ?? 1);
        const ps = Number(query.pageSize ?? 12);
        const items = rows
          .map((row: unknown) => this.mapDesignedCatalogRow(row))
          .filter((row): row is FactoryDesignedCatalogItem => row != null);

        const pageIndexRaw = this.pickNumberFromUnknown(box as Record<string, unknown>, [
          'pageIndex',
          'PageIndex'
        ]);
        const pageSizeRaw = this.pickNumberFromUnknown(box as Record<string, unknown>, [
          'pageSize',
          'PageSize'
        ]);
        const pagesRaw = this.pickNumberFromUnknown(box as Record<string, unknown>, ['pages', 'Pages']);
        const recordsRaw = this.pickNumberFromUnknown(box as Record<string, unknown>, [
          'records',
          'Records',
          'totalCount',
          'TotalCount',
          'recordCount',
          'RecordCount'
        ]);

        return {
          items,
          pageIndex: pageIndexRaw ?? pi,
          pageSize: pageSizeRaw ?? ps,
          pages: Math.max(pagesRaw ?? 0, 0),
          records: recordsRaw ?? items.length
        };
      }),
      catchError(() =>
        of({
          items: [],
          pageIndex: query.pageIndex ?? 1,
          pageSize: query.pageSize ?? 12,
          pages: 0,
          records: 0
        })
      )
    );
  }

  /** Back-compat: loads up to 100 templates for dashboards and simple lists. */
  getDesignedProducts(): Observable<FactoryDesignedCatalogItem[]> {
    return this.getDesignedProductsCatalog({ pageIndex: 1, pageSize: 100 }).pipe(
      map(page => page.items)
    );
  }

  private mapDesignedCatalogRow(item: unknown): FactoryDesignedCatalogItem | null {
    if (!item || typeof item !== 'object') return null;
    const o = item as Record<string, unknown>;
    const id =
      this.toNum(o['id'] ?? o['Id'] ?? o['designedProductId'] ?? o['DesignedProductId'] ?? o['productId'] ?? o['ProductId']) ??
      0;
    if (!id) return null;
    const name =
      this.pickString(o, [
        'name',
        'Name',
        'productName',
        'ProductName',
        'title',
        'Title'
      ]) || `Designed product #${id}`;
    const price = this.toNum(o['price'] ?? o['Price']) ?? 0;
    const categoryName =
      this.pickString(o, ['categoryName', 'CategoryName']) || '';
    const mainImageUrl =
      this.pickString(o, ['mainImageUrl', 'MainImageUrl']) || null;
    const averageRatingRaw = this.toNum(o['averageRating'] ?? o['AverageRating']);
    const reviewCountRaw = this.toNum(o['reviewCount'] ?? o['ReviewCount'] ?? o['ratingsCount'] ?? o['RatingsCount']) ?? 0;
    const targetAudienceLabel = this.targetAudienceLabelFromRow(o);
    return {
      id,
      name,
      price,
      categoryName,
      mainImageUrl: mainImageUrl || null,
      targetAudienceLabel,
      averageRating: averageRatingRaw != null ? Number(averageRatingRaw.toFixed(1)) : null,
      reviewCount: Math.max(0, Math.floor(reviewCountRaw))
    };
  }

  /** First numeric candidate from object keys. */
  private pickNumberFromUnknown(
    obj: Record<string, unknown>,
    keys: string[]
  ): number | undefined {
    for (const k of keys) {
      const v = obj[k];
      const n =
        typeof v === 'number' && Number.isFinite(v)
          ? v
          : typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim())
            ? Number(v.trim())
            : NaN;
      if (Number.isFinite(n)) return n;
    }
    return undefined;
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
  getProductColors(productId: number): Observable<{ colorId: number; name: string; hexCode: string; imageUrl: string | null; frontImageUrl?: string | null; backImageUrl?: string | null; rightImageUrl?: string | null; leftImageUrl?: string | null; }[]> {
    const url = `${this.base}/api/factories/products/${productId}/colors`;
    console.log('Fetching colors from:', url);
    return this.http.get<ApiEnvelope | any>(url).pipe(
      map(res => {
        console.log('Colors API response:', res);
        const list = this.unwrapPayload<any[]>(res) ?? [];
        console.log('Extracted colors list:', list);
        const mapped = list.map(c => {
          let front = c.frontImageUrl ?? c.FrontImageUrl ?? null;
          let back = c.backImageUrl ?? c.BackImageUrl ?? null;
          let right = c.rightImageUrl ?? c.RightImageUrl ?? null;
          let left = c.leftImageUrl ?? c.LeftImageUrl ?? null;
          
          const imgs = c.images ?? c.Images;
          if (Array.isArray(imgs)) {
            imgs.forEach((img: any) => {
               const side = img.viewSide ?? img.ViewSide;
               const url = img.imageUrl ?? img.ImageUrl;
               if (side === 'Front' || side === 1) front = url;
               if (side === 'Back' || side === 2) back = url;
               if (side === 'Right' || side === 3) right = url;
               if (side === 'Left' || side === 4) left = url;
            });
          }

          return {
            colorId: c.id ?? c.colorId ?? c.Id ?? c.ColorId ?? 0,
            name: c.name ?? c.Name ?? '',
            hexCode: c.hexCode ?? c.HexCode ?? '',
            imageUrl: c.imageUrl ?? c.ImageUrl ?? c.mainImageUrl ?? c.MainImageUrl ?? c.image ?? c.Image ?? null,
            frontImageUrl: front,
            backImageUrl: back,
            rightImageUrl: right,
            leftImageUrl: left
          };
        });
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

  /** GET /api/factory-managers/all — full list for factory admin UI */
  getAllFactoryManagers(): Observable<FactoryManager[]> {
    const url = `${this.base}/api/factory-managers/all`;
    return this.http.get<unknown>(url).pipe(
      map(res => this.normalizeFactoryManagerList(res)),
      catchError(() => of([]))
    );
  }

  /** DELETE /api/factories/managers/{factoryManagerId} */
  deleteFactoryManager(factoryManagerId: number, reason: string): Observable<void> {
    const url = `${this.base}/api/factories/managers/${factoryManagerId}`;
    const trimmed = reason.trim();
    return this.http
      .request<ApiEnvelope | null>('DELETE', url, {
        headers: new HttpHeaders({
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }),
        body: { reason: trimmed, Reason: trimmed }
      })
      .pipe(
        map(body => {
          if (body && typeof body === 'object' && 'isSuccess' in body && !body.isSuccess) {
            throw this.envErr(body as ApiEnvelope);
          }
        }),
        catchError(e => this.mapErr(e))
      );
  }

  private normalizeFactoryManagerList(res: unknown): FactoryManager[] {
    const raw = this.unwrapPayload<unknown>(res as ApiEnvelope<unknown>) ?? res;
    let rows: unknown[] = [];
    if (Array.isArray(raw)) {
      rows = raw;
    } else if (raw && typeof raw === 'object') {
      const o = raw as Record<string, unknown>;
      const inner =
        o['items'] ??
        o['Items'] ??
        o['data'] ??
        o['Data'] ??
        o['managers'] ??
        o['Managers'];
      if (Array.isArray(inner)) {
        rows = inner;
      } else if (inner && typeof inner === 'object') {
        const nested = (inner as Record<string, unknown>)['items'] ?? (inner as Record<string, unknown>)['Items'];
        if (Array.isArray(nested)) {
          rows = nested;
        }
      }
    }
    const out: FactoryManager[] = [];
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const id =
        this.toNum(r['id'] ?? r['Id'] ?? r['userId'] ?? r['UserId'] ?? r['managerId'] ?? r['ManagerId']) ?? 0;
      const email = this.pickString(r, ['email', 'Email', 'userEmail', 'UserEmail']) || '';
      const name =
        this.pickString(r, ['name', 'Name', 'fullName', 'FullName']) ||
        [this.pickString(r, ['firstName', 'FirstName']), this.pickString(r, ['lastName', 'LastName'])]
          .filter(Boolean)
          .join(' ')
          .trim() ||
        email ||
        `Manager #${id || out.length + 1}`;
      const phoneNumber = this.pickString(r, ['phoneNumber', 'PhoneNumber', 'phone', 'Phone']) || undefined;
      const activeRaw = r['isActive'] ?? r['IsActive'] ?? r['active'] ?? r['Active'];
      const isActive = activeRaw === undefined || activeRaw === null ? true : Boolean(activeRaw);
      if (!id && !email) continue;
      out.push({
        id: id || out.length + 1,
        name,
        email: email || '—',
        phoneNumber,
        isActive
      });
    }
    return out;
  }

  /** GET /api/factories/wallet */
  getFactoryWallet(): Observable<FactoryWalletSummary> {
    const url = `${this.base}/api/factories/wallet`;
    return this.http.get<unknown>(url).pipe(
      map(res => {
        const payload = this.unwrapPayload<any>(res) ?? {};
        const balance =
          this.toNum(payload?.balance ?? payload?.Balance) ?? 0;
        const txRows = Array.isArray(payload?.recentTransactions ?? payload?.RecentTransactions)
          ? (payload.recentTransactions ?? payload.RecentTransactions)
          : [];
        const recentTransactions: FactoryWalletTransaction[] = txRows.map((row: any) => {
          const r = row ?? {};
          const createdRaw =
            r['createdOn'] ??
            r['CreatedOn'] ??
            r['createdAt'] ??
            r['CreatedAt'];
          const createdOn =
            normalizeWearCastApiDateToIso(createdRaw) ||
            this.pickString(r as Record<string, unknown>, ['createdOn', 'CreatedOn']) ||
            '';
          return {
            type: this.pickString(r as Record<string, unknown>, ['type', 'Type']) || '—',
            amount: this.toNum(r['amount'] ?? r['Amount']) ?? 0,
            description:
              this.pickString(r as Record<string, unknown>, ['description', 'Description']) || '—',
            referenceOrderId:
              this.toNum(r['referenceOrderId'] ?? r['ReferenceOrderId']) ?? null,
            senderName:
              this.pickString(r as Record<string, unknown>, ['senderName', 'SenderName']) || '',
            senderEmail:
              this.pickString(r as Record<string, unknown>, ['senderEmail', 'SenderEmail']) || '',
            createdOn
          };
        });
        return { balance, recentTransactions };
      }),
      catchError(e => this.mapErr(e))
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

  /** GET /api/Orders/GetAllByID — flat list only (backward compatible). */
  getFactoryOrders(
    pageNumber = 1,
    pageSize = 50
  ): Observable<FactoryOrderSummary[]> {
    return this.getFactoryOrdersPage(pageNumber, pageSize).pipe(map(p => p.orders));
  }

  /** Same endpoint with paging metadata when the envelope includes counts. */
  getFactoryOrdersPage(
    pageNumber = 1,
    pageSize = 50
  ): Observable<FactoryOrdersPage> {
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
      map(res => this.parseFactoryOrdersEnvelope(res, pageNumber, pageSize)),
      catchError(() =>
        of({
          orders: [],
          pageNumber,
          pageSize,
          totalRecords: 0,
          totalPages: 1
        })
      )
    );
  }

  private parseFactoryOrdersEnvelope(
    res: unknown,
    pageNumber: number,
    pageSize: number
  ): FactoryOrdersPage {
    const unpacked = this.unwrapPayload<any>(res) ?? res ?? {};
    const obj: Record<string, unknown> =
      typeof unpacked === 'object' &&
      unpacked != null &&
      !Array.isArray(unpacked)
        ? (unpacked as Record<string, unknown>)
        : {};
    const listRaw = Array.isArray(unpacked)
      ? unpacked
      : obj['items'] ?? obj['Items'] ?? obj['data'] ?? [];
    const list = Array.isArray(listRaw) ? listRaw : [];
    const orders = list.map((row: Record<string, unknown>) =>
      this.mapFactoryOrderSummaryRow(row)
    );
    const explicitRecords = this.pickNumberFromUnknown(obj, [
      'records',
      'Records',
      'totalCount',
      'TotalCount',
      'recordCount',
      'RecordCount'
    ]);
    let totalRecords: number;
    if (explicitRecords != null && Number.isFinite(explicitRecords) && explicitRecords >= 0) {
      totalRecords = explicitRecords;
    } else if (orders.length < pageSize) {
      totalRecords = (pageNumber - 1) * pageSize + orders.length;
    } else {
      totalRecords = pageNumber * pageSize + 1;
    }
    let totalPages =
      this.pickNumberFromUnknown(obj, ['pages', 'Pages', 'totalPages', 'TotalPages']) ?? 0;
    if (!totalPages || totalPages < 1) {
      totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    }
    const pn =
      this.pickNumberFromUnknown(obj, ['pageNumber', 'PageNumber']) ?? pageNumber;
    const ps =
      this.pickNumberFromUnknown(obj, ['pageSize', 'PageSize']) ?? pageSize;
    return { orders, pageNumber: pn, pageSize: ps, totalRecords, totalPages };
  }

  private mapFactoryOrderSummaryRow(row?: Record<string, unknown>): FactoryOrderSummary {
    const r = row ?? {};
    const createdRaw =
      r['createdOn'] ??
      r['CreatedOn'] ??
      r['createdAt'] ??
      r['CreatedAt'];
    const createdOn =
      normalizeWearCastApiDateToIso(createdRaw) ||
      this.pickString(r as Record<string, unknown>, [
        'createdOn',
        'CreatedOn',
        'createdAt',
        'CreatedAt'
      ]) ||
      '';
    return {
      id: this.toNum(r['id'] ?? r['Id'] ?? r['orderId'] ?? r['OrderId']) ?? 0,
      status: this.pickString(r, ['status', 'Status']) || 'Unknown',
      createdOn,
      recipientName: this.pickString(r, ['recipientName', 'RecipientName']) || 'Customer',
      recipientPhoneNumber:
        this.pickString(r, ['recipientPhoneNumber', 'RecipientPhoneNumber']) || '',
      totalAmount:
        this.toNum(r['totalAmount'] ?? r['TotalAmount'] ?? r['amount'] ?? r['Amount']) ??
        0,
      itemsCount:
        this.toNum(
          r['itemsCount'] ??
            r['ItemsCount'] ??
            r['totalOrderItems'] ??
            r['TotalOrderItems'] ??
            (Array.isArray(r['items']) ? (r['items'] as unknown[]).length : null)
        ) ?? 0,
      totalOrderItems:
        this.toNum(r['totalOrderItems'] ?? r['TotalOrderItems']) ?? undefined
    };
  }

  /** PUT /api/Orders/{orderId}/status — update order status (e.g., to "Ready").
   * Request body: { "newStatus": "Ready" } - sends status as string
   */
  updateOrderStatus(orderId: number, newStatus: string): Observable<void> {
    const url = `${this.base}/api/Orders/${orderId}/status`;
    const factoryId = this.auth.getFactoryId();
    let params = new HttpParams();
    if (factoryId != null) {
      params = params.set('providedFactoryId', String(factoryId));
    }
    const body = { newStatus };
    return this.http.put<ApiEnvelope>(url, body, { params }).pipe(
      map(res => {
        if (res && typeof res === 'object' && 'isSuccess' in res && !res.isSuccess) {
          throw this.envErr(res as ApiEnvelope);
        }
      }),
      catchError(e => this.mapErr(e))
    );
  }

  /** GET /api/Orders/{orderId}/items — list order items. */
  getFactoryOrderItems(orderId: number): Observable<FactoryOrderItem[]> {
    const url = `${this.base}/api/Orders/${orderId}/items`;
    return this.http.get<unknown>(url).pipe(
      map(res => {
        const payload = this.unwrapPayload<any>(res) ?? res;
        const rawRows = this.extractOrderItemRows(payload);
        if (!rawRows.length) return [];
        return rawRows.map((row: any) => {
          const o = (row ?? {}) as Record<string, unknown>;
          const designedProductId = this.toNum(o['designedProductId'] ?? o['DesignedProductId']);
          const customerDesignId =
            this.toNum(o['customerDesignId'] ?? o['CustomerDesignId']) ??
            this.toNum(o['designId'] ?? o['DesignId'] ?? o['customerDesignID'] ?? o['CustomerDesignID']);
          const orderItemType = this.pickString(o, ['orderItemType', 'OrderItemType']);
          const isDesignedRow = /design/i.test(orderItemType);
          const img = this.extractFactoryOrderItemImageUrls(o);
          let frontImageUrl = img.frontImageUrl;
          let backImageUrl = img.backImageUrl;
          let rightImageUrl = img.rightImageUrl;
          let leftImageUrl = img.leftImageUrl;
          let imageUrl = img.primaryImageUrl;
          frontImageUrl = this.resolveFactoryMediaUrl(frontImageUrl);
          backImageUrl = this.resolveFactoryMediaUrl(backImageUrl);
          rightImageUrl = this.resolveFactoryMediaUrl(rightImageUrl);
          leftImageUrl = this.resolveFactoryMediaUrl(leftImageUrl);
          imageUrl = this.resolveFactoryMediaUrl(imageUrl);
          const galleryImageUrls = [
            frontImageUrl,
            backImageUrl,
            rightImageUrl,
            leftImageUrl,
            imageUrl
          ].filter((u, i, arr): u is string => !!u && arr.indexOf(u) === i);
          const sizes = Array.isArray(o['sizes'] ?? o['Sizes']) ? (o['sizes'] ?? o['Sizes']) as any[] : [];
          const size = sizes.length
            ? sizes
                .map(s => {
                  const name = this.pickString(s ?? {}, ['sizeName', 'SizeName', 'size', 'Size']).replace(/^_/, '');
                  const qty = this.toNum((s ?? {})['quantity'] ?? (s ?? {})['Quantity']) ?? 0;
                  return name ? `${name}${qty > 0 ? ` x${qty}` : ''}` : '';
                })
                .filter(Boolean)
                .join(', ')
            : this.pickString(o, ['size', 'Size']) || '-';
          const quantity = this.toNum(o['totalQuantity'] ?? o['TotalQuantity'] ?? o['quantity'] ?? o['Quantity']) ?? 0;
          const unitPrice = this.toNum(o['unitPrice'] ?? o['UnitPrice'] ?? o['price'] ?? o['Price']) ?? 0;
          const totalPrice =
            this.toNum(o['totalPrice'] ?? o['TotalPrice']) ??
            quantity * unitPrice;
          return {
            kind:
              isDesignedRow || designedProductId != null || customerDesignId != null
                ? 'designed'
                : 'fixed',
            designedProductId: designedProductId ?? undefined,
            customerDesignId: customerDesignId ?? undefined,
            productName:
              this.pickString(o, ['productName', 'ProductName', 'name', 'Name']) || 'Item',
            colorName: this.pickString(o, ['colorName', 'ColorName']) || undefined,
            imageUrl,
            frontImageUrl,
            backImageUrl,
            rightImageUrl,
            leftImageUrl,
            galleryImageUrls,
            quantity,
            unitPrice,
            totalPrice,
            size,
            raw: o
          } as FactoryOrderItem;
        });
      }),
      catchError(() => of([]))
    );
  }

  /** Dev: strip absolute backend host so `/uploads/...` loads via Angular proxy. Prod: prefix relative paths with apiUrl. */
  private resolveFactoryMediaUrl(raw: string | null | undefined): string | null {
    if (raw == null) return null;
    const u = String(raw).trim();
    if (!u) return null;
    if (u.startsWith('data:')) return u;
    if (/^https?:\/\//i.test(u)) {
      if (!this.base) {
        try {
          const urlObj = new URL(u);
          return urlObj.pathname + urlObj.search;
        } catch {
          return u;
        }
      }
      return u;
    }
    if (u.startsWith('//')) {
      return `${typeof window !== 'undefined' ? window.location.protocol : 'https:'}${u}`;
    }
    const base = this.base.replace(/\/$/, '');
    const path = u.startsWith('/') ? u : `/${u}`;
    return base ? `${base}${path}` : path;
  }

  private firstViewImageUrl(viewImages: unknown, side: string): string | null {
    if (!Array.isArray(viewImages)) return null;
    const want = side.toLowerCase();
    let fallback: string | null = null;
    for (const img of viewImages) {
      if (!img || typeof img !== 'object') continue;
      const ob = img as Record<string, unknown>;
      const url =
        this.pickString(ob, ['url', 'Url', 'imageUrl', 'ImageUrl', 'fileUrl', 'FileUrl']) || null;
      if (!url) continue;
      if (!fallback) fallback = url;
      const sideRaw =
        ob['side'] ?? ob['Side'] ?? ob['view'] ?? ob['View'] ?? ob['viewSide'] ?? ob['ViewSide'];
      const s = String(sideRaw ?? '').toLowerCase();
      if (want === 'front' && (!s || s === 'front' || s === '0' || s === '1')) {
        return url;
      }
      if (want !== 'front' && s === want) {
        return url;
      }
    }
    return want === 'front' ? fallback : null;
  }

  private extractFactoryOrderItemImageUrls(o: Record<string, unknown>): {
    frontImageUrl: string | null;
    backImageUrl: string | null;
    rightImageUrl: string | null;
    leftImageUrl: string | null;
    primaryImageUrl: string | null;
  } {
    const viewImages = o['viewImages'] ?? o['ViewImages'] ?? o['designImages'] ?? o['DesignImages'];

    const nestedUrl = (key: string): string | null => {
      const nested = o[key] ?? o[key.charAt(0).toUpperCase() + key.slice(1)];
      if (!nested || typeof nested !== 'object' || Array.isArray(nested)) return null;
      return (
        this.pickString(nested as Record<string, unknown>, [
          'url',
          'Url',
          'imageUrl',
          'ImageUrl',
          'fileUrl',
          'FileUrl'
        ]) || null
      );
    };

    let frontImageUrl =
      this.pickString(o, [
        'frontImageUrl',
        'FrontImageUrl',
        'frontDesignImageUrl',
        'FrontDesignImageUrl',
        'frontViewImageUrl',
        'FrontViewImageUrl'
      ]) ||
      nestedUrl('frontImage') ||
      this.firstViewImageUrl(viewImages, 'front');

    let backImageUrl =
      this.pickString(o, ['backImageUrl', 'BackImageUrl', 'backDesignImageUrl', 'BackDesignImageUrl']) ||
      nestedUrl('backImage') ||
      this.firstViewImageUrl(viewImages, 'back');

    let rightImageUrl =
      this.pickString(o, ['rightImageUrl', 'RightImageUrl']) ||
      nestedUrl('rightImage') ||
      this.firstViewImageUrl(viewImages, 'right');

    let leftImageUrl =
      this.pickString(o, ['leftImageUrl', 'LeftImageUrl']) ||
      nestedUrl('leftImage') ||
      this.firstViewImageUrl(viewImages, 'left');

    let primaryImageUrl =
      this.pickString(o, [
        'imageUrl',
        'ImageUrl',
        'thumbnailUrl',
        'ThumbnailUrl',
        'mainImageUrl',
        'MainImageUrl',
        'previewImageUrl',
        'PreviewImageUrl',
        'productImage',
        'ProductImage'
      ]) || null;

    if (!primaryImageUrl) {
      primaryImageUrl = frontImageUrl || backImageUrl || rightImageUrl || leftImageUrl;
    }

    const imagesArr = o['images'] ?? o['Images'];
    if (Array.isArray(imagesArr) && !primaryImageUrl) {
      for (const img of imagesArr) {
        if (!img || typeof img !== 'object') continue;
        const url =
          this.pickString(img as Record<string, unknown>, [
            'url',
            'Url',
            'imageUrl',
            'ImageUrl',
            'fileUrl',
            'FileUrl'
          ]) || null;
        if (url) {
          primaryImageUrl = url;
          break;
        }
      }
    }

    return {
      frontImageUrl: frontImageUrl || null,
      backImageUrl: backImageUrl || null,
      rightImageUrl: rightImageUrl || null,
      leftImageUrl: leftImageUrl || null,
      primaryImageUrl: primaryImageUrl || null
    };
  }

  private extractOrderItemRows(payload: unknown): any[] {
    if (Array.isArray(payload)) {
      return payload;
    }
    if (!payload || typeof payload !== 'object') {
      return [];
    }
    const p = payload as Record<string, unknown>;
    const directList =
      p['items'] ?? p['Items'] ?? p['records'] ?? p['Records'] ?? p['data'] ?? p['Data'];
    const aggregated: any[] = [];
    if (Array.isArray(directList) && directList.length > 0) {
      aggregated.push(...directList);
    }
    if (directList && typeof directList === 'object') {
      const inner = directList as Record<string, unknown>;
      const nestedList =
        inner['items'] ?? inner['Items'] ?? inner['records'] ?? inner['Records'] ?? inner['data'] ?? inner['Data'];
      if (Array.isArray(nestedList) && nestedList.length > 0) {
        aggregated.push(...nestedList);
      }
    }
    const grouped = this.extractGroupedItems(p);
    const unique = [...aggregated, ...grouped];
    return unique.filter(row => !!row && typeof row === 'object');
  }

  private extractGroupedItems(box: Record<string, unknown>): any[] {
    const out: any[] = [];
    const pushFrom = (value: unknown) => {
      if (Array.isArray(value)) {
        out.push(...value);
        return;
      }
      if (value && typeof value === 'object') {
        const o = value as Record<string, unknown>;
        const nested = o['items'] ?? o['Items'] ?? o['records'] ?? o['Records'] ?? o['data'] ?? o['Data'];
        if (Array.isArray(nested)) {
          out.push(...nested);
        }
      }
    };

    pushFrom(box['fixedItems']);
    pushFrom(box['FixedItems']);
    pushFrom(box['designedItems']);
    pushFrom(box['DesignedItems']);

    const rootItems = box['items'] ?? box['Items'];
    if (rootItems && typeof rootItems === 'object' && !Array.isArray(rootItems)) {
      const rootObj = rootItems as Record<string, unknown>;
      pushFrom(rootObj['fixedItems'] ?? rootObj['FixedItems']);
      pushFrom(rootObj['designedItems'] ?? rootObj['DesignedItems']);
    }

    const rootData = box['data'] ?? box['Data'];
    if (rootData && typeof rootData === 'object' && !Array.isArray(rootData)) {
      const rootDataObj = rootData as Record<string, unknown>;
      pushFrom(rootDataObj['fixedItems'] ?? rootDataObj['FixedItems']);
      pushFrom(rootDataObj['designedItems'] ?? rootDataObj['DesignedItems']);
    }

    return out;
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
        const rawData = res.data;
        let id: number | undefined = undefined;
        if (typeof rawData === 'number' && Number.isFinite(rawData)) {
          id = rawData;
        } else if (typeof rawData === 'string' && /^\d+$/.test(rawData)) {
          id = parseInt(rawData, 10);
        } else if (rawData && typeof rawData === 'object') {
          const dataObj = rawData as Record<string, unknown>;
          id =
            this.toNum(
              dataObj['id'] ??
                dataObj['Id'] ??
                dataObj['sizeId'] ??
                dataObj['SizeId'] ??
                dataObj['productSizeId'] ??
                dataObj['ProductSizeId'] ??
                dataObj['sizeDetailId'] ??
                dataObj['SizeDetailId']
            ) ?? undefined;
        }
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

  /** DELETE /api/factories/products/colors/{colorId} */
  deleteProductColor(productId: number, colorId: number): Observable<void> {
    const url = `${this.base}/api/factories/products/colors/${colorId}`;
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
