import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/** Query params for GET /api/CustomerShipments (integers must match backend enums). */
export interface CustomerShipmentListQuery {
  customerId?: number | null;
  pageIndex?: number;
  pageSize?: number;
  /** Backend `SortBy` enum as integer; omit for API default (typically newest first). */
  sortBy?: number | null;
  /** Backend `ShipmentStatus` enum as integer; omit to include all statuses. */
  shipmentStatus?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  deliveryCity?: string | null;
  deliveryStreet?: string | null;
}

export interface CustomerShipmentListResult {
  items: CustomerShipmentRow[];
  pageIndex: number;
  pageSize: number;
  pages: number;
  records: number;
}

/** Normalized row for list UI — field names follow common API Pascal/camel variants. */
export interface CustomerShipmentRow {
  id: number;
  status: number | null;
  total: number;
  createdAt: string | null;
  deliveryCity: string;
  deliveryStreet: string;
  recipientName: string | null;
  raw: Record<string, unknown>;
}

export interface CustomerShipmentAddressVm {
  state: string;
  city: string;
  street: string;
  buildingNumber: string;
}

export interface CustomerShipmentTimelineEntryVm {
  label: string;
  at: string | null;
}

export interface CustomerShipmentOrderLineVm {
  title: string;
  subtitle: string;
  quantity: number;
  unitPrice: number | null;
  lineTotal: number | null;
  imageUrl: string | null;
}

/** View model for GET /api/Customer/shipments/{id} */
export interface CustomerShipmentDetailVm {
  id: number;
  price: number;
  shipmentStatus: number | null;
  orderedAt: string | null;
  deliveryAddress: CustomerShipmentAddressVm | null;
  driverName: string | null;
  driverPhoneNumber: string | null;
  timeline: CustomerShipmentTimelineEntryVm[];
  orderLines: CustomerShipmentOrderLineVm[];
}

@Injectable({ providedIn: 'root' })
export class CustomerShipmentsService {
  private readonly base = environment.apiUrl.replace(/\/$/, '');

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService
  ) {}

  list(q: CustomerShipmentListQuery): Observable<CustomerShipmentListResult> {
    const url = `${this.base}/api/CustomerShipments`;
    let params = new HttpParams();
    if (q.customerId != null && q.customerId > 0) {
      params = params.set('CustomerId', String(q.customerId));
    }
    const pageIndex = q.pageIndex ?? 1;
    const pageSize = q.pageSize ?? 10;
    params = params.set('PageIndex', String(pageIndex)).set('PageSize', String(pageSize));
    if (q.sortBy != null && Number.isFinite(q.sortBy)) {
      params = params.set('SortBy', String(q.sortBy));
    }
    if (q.shipmentStatus != null && Number.isFinite(q.shipmentStatus)) {
      params = params.set('ShipmentStatus', String(q.shipmentStatus));
    }
    if (q.minPrice != null && q.minPrice > 0) {
      params = params.set('MinPrice', String(q.minPrice));
    }
    if (q.maxPrice != null && q.maxPrice > 0) {
      params = params.set('MaxPrice', String(q.maxPrice));
    }
    const city = q.deliveryCity?.trim();
    if (city) params = params.set('DeliveryCity', city);
    const street = q.deliveryStreet?.trim();
    if (street) params = params.set('DeliveryStreet', street);

    return this.http.get<unknown>(url, { params, ...this.authOpts() }).pipe(
      map(body => normalizeShipmentListPage(body)),
      catchError(() =>
        of({
          items: [],
          pageIndex,
          pageSize,
          pages: 0,
          records: 0
        })
      )
    );
  }

  getShipmentById(shipmentId: number): Observable<CustomerShipmentDetailVm | null> {
    const url = `${this.base}/api/Customer/shipments/${shipmentId}`;
    return this.http.get<unknown>(url, { ...this.authOpts() }).pipe(
      map(body => normalizeShipmentDetail(unwrapDataObject(body))),
      catchError(() => of(null))
    );
  }

  private authOpts(): { headers?: HttpHeaders } {
    const t = this.auth.getToken();
    return t
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${t}` }) }
      : {};
  }
}

function normalizeShipmentListPage(root: unknown): CustomerShipmentListResult {
  const payload = unwrapPagedPayload(root);
  const itemsRaw = payload.items;
  const rows: CustomerShipmentRow[] = [];
  if (Array.isArray(itemsRaw)) {
    for (const r of itemsRaw) {
      const row = mapShipmentRow(r);
      if (row) rows.push(row);
    }
  }
  return {
    items: rows,
    pageIndex: pickNum(payload.obj, ['pageIndex', 'PageIndex']) ?? 1,
    pageSize: pickNum(payload.obj, ['pageSize', 'PageSize']) ?? 10,
    pages: pickNum(payload.obj, ['pages', 'Pages']) ?? 0,
    records: pickNum(payload.obj, ['records', 'Records', 'totalCount', 'TotalCount']) ?? rows.length
  };
}

function mapShipmentRow(r: unknown): CustomerShipmentRow | null {
  if (!r || typeof r !== 'object') return null;
  const o = r as Record<string, unknown>;
  const id = pickNum(o, ['id', 'Id', 'shipmentId', 'ShipmentId']);
  if (id == null || id <= 0) return null;
  const addr = (o['deliveryAddress'] ?? o['DeliveryAddress']) as
    | Record<string, unknown>
    | undefined;
  const ship = (o['shippingInfo'] ?? o['ShippingInfo']) as Record<string, unknown> | undefined;
  const city =
    pickStr(o, ['deliveryCity', 'DeliveryCity']) ||
    (addr ? pickStr(addr, ['city', 'City']) : '') ||
    (ship ? pickStr(ship, ['city', 'City']) : '') ||
    '';
  const street =
    pickStr(o, ['deliveryStreet', 'DeliveryStreet']) ||
    (addr ? pickStr(addr, ['street', 'Street']) : '') ||
    (ship ? pickStr(ship, ['street', 'Street']) : '') ||
    '';
  const recipient =
    ship
      ? pickStr(ship, ['recipientName', 'RecipientName']) || null
      : pickStr(o, ['recipientName', 'RecipientName']) || null;
  const total =
    pickFloat(o, [
      'price',
      'Price',
      'totalPrice',
      'TotalPrice',
      'total',
      'Total',
      'amount',
      'Amount'
    ]) ?? 0;
  const status = pickNum(o, ['status', 'Status', 'shipmentStatus', 'ShipmentStatus']);
  const createdAt =
    pickStr(o, [
      'orderedAt',
      'OrderedAt',
      'createdAt',
      'CreatedAt',
      'orderDate',
      'OrderDate',
      'date',
      'Date'
    ]) || null;
  return {
    id,
    status: status ?? null,
    total,
    createdAt,
    deliveryCity: city,
    deliveryStreet: street,
    recipientName: recipient,
    raw: o
  };
}

function normalizeShipmentDetail(
  raw: Record<string, unknown> | null
): CustomerShipmentDetailVm | null {
  if (!raw) return null;
  const id = pickNum(raw, ['id', 'Id', 'shipmentId', 'ShipmentId']);
  if (id == null || id <= 0) return null;
  const price =
    pickFloat(raw, ['price', 'Price', 'totalPrice', 'TotalPrice', 'total', 'Total']) ?? 0;
  const shipmentStatus = pickNum(raw, ['shipmentStatus', 'ShipmentStatus', 'status', 'Status']);
  const orderedAt =
    pickStr(raw, ['orderedAt', 'OrderedAt', 'createdAt', 'CreatedAt']) || null;
  const deliveryAddress = parseDeliveryAddressVm(raw);
  const driverName = pickStr(raw, ['driverName', 'DriverName']) || null;
  const driverPhone =
    pickStr(raw, ['driverPhoneNumber', 'DriverPhoneNumber', 'driverPhone', 'DriverPhone']) ||
    null;
  const timeline: CustomerShipmentTimelineEntryVm[] = [
    { label: 'Ordered', at: pickIso(raw, ['orderedAt', 'OrderedAt']) },
    {
      label: 'Ready for pickup',
      at: pickIso(raw, ['readyForPickUpAt', 'ReadyForPickUpAt'])
    },
    { label: 'Trip started', at: pickIso(raw, ['tripStartedAt', 'TripStartedAt']) },
    {
      label: 'Out for delivery',
      at: pickIso(raw, ['outForDeliveryAt', 'OutForDeliveryAt'])
    },
    { label: 'Delivered', at: pickIso(raw, ['deliveredAt', 'DeliveredAt']) }
  ];
  const ordersRaw = raw['orders'] ?? raw['Orders'];
  const orderLines: CustomerShipmentOrderLineVm[] = [];
  if (Array.isArray(ordersRaw)) {
    for (const el of ordersRaw) {
      const line = mapShipmentOrderLine(el);
      if (line) orderLines.push(line);
    }
  }
  return {
    id,
    price,
    shipmentStatus: shipmentStatus ?? null,
    orderedAt,
    deliveryAddress,
    driverName: driverName || null,
    driverPhoneNumber: driverPhone || null,
    timeline,
    orderLines
  };
}

function pickIso(o: Record<string, unknown>, keys: string[]): string | null {
  const s = pickStr(o, keys);
  return s || null;
}

function parseDeliveryAddressVm(
  raw: Record<string, unknown>
): CustomerShipmentAddressVm | null {
  const box = raw['deliveryAddress'] ?? raw['DeliveryAddress'];
  if (!box || typeof box !== 'object' || Array.isArray(box)) return null;
  const o = box as Record<string, unknown>;
  const vm: CustomerShipmentAddressVm = {
    state: pickStr(o, ['state', 'State']),
    city: pickStr(o, ['city', 'City']),
    street: pickStr(o, ['street', 'Street']),
    buildingNumber: pickStr(o, ['buildingNumber', 'BuildingNumber'])
  };
  if (!vm.state && !vm.city && !vm.street && !vm.buildingNumber) return null;
  return vm;
}

function mapShipmentOrderLine(entry: unknown): CustomerShipmentOrderLineVm | null {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const o = entry as Record<string, unknown>;
  const nested =
    (o['order'] ??
      o['Order'] ??
      o['line'] ??
      o['Line'] ??
      o['orderLine'] ??
      o['OrderLine']) as Record<string, unknown> | undefined;
  const src =
    nested && typeof nested === 'object' && !Array.isArray(nested) ? nested : o;
  const title =
    pickStr(src, [
      'productName',
      'ProductName',
      'name',
      'Name',
      'title',
      'Title',
      'description',
      'Description'
    ]) || pickStr(o, ['productName', 'ProductName', 'name', 'Name']) || 'Item';
  const subtitle =
    pickStr(src, ['size', 'Size', 'sku', 'Sku', 'colorName', 'ColorName']) ||
    pickStr(o, ['size', 'Size']) ||
    '';
  const qRaw = pickNum(src, ['quantity', 'Quantity']) ?? pickNum(o, ['quantity', 'Quantity']);
  const quantity = qRaw != null && qRaw > 0 ? qRaw : 1;
  const unitPrice =
    pickFloat(src, ['unitPrice', 'UnitPrice', 'price', 'Price']) ??
    pickFloat(o, ['unitPrice', 'UnitPrice', 'price', 'Price']);
  const lineTotal =
    pickFloat(src, ['lineTotal', 'LineTotal', 'total', 'Total', 'subTotal', 'SubTotal']) ??
    pickFloat(o, ['lineTotal', 'LineTotal', 'total', 'Total']);
  const imageUrl =
    pickStr(src, [
      'imageUrl',
      'ImageUrl',
      'thumbnailUrl',
      'ThumbnailUrl',
      'mainImageUrl',
      'MainImageUrl'
    ]) ||
    pickStr(o, ['imageUrl', 'ImageUrl']) ||
    null;
  return {
    title,
    subtitle,
    quantity: Math.max(1, quantity),
    unitPrice: unitPrice ?? null,
    lineTotal: lineTotal ?? null,
    imageUrl: imageUrl || null
  };
}

function unwrapPagedPayload(root: unknown): { obj: Record<string, unknown>; items: unknown[] } {
  const flat = unwrapDataObject(root);
  if (!flat || typeof flat !== 'object') {
    return { obj: {}, items: [] };
  }
  const o = flat as Record<string, unknown>;
  let items = o['items'] ?? o['Items'] ?? o['data'] ?? o['Data'];
  if (items && typeof items === 'object' && !Array.isArray(items)) {
    const inner = items as Record<string, unknown>;
    items = inner['items'] ?? inner['Items'] ?? inner['records'] ?? [];
  }
  return {
    obj: o,
    items: Array.isArray(items) ? items : []
  };
}

function unwrapDataObject(root: unknown): Record<string, unknown> | null {
  if (root == null) return null;
  if (typeof root !== 'object' || Array.isArray(root)) return null;
  const o = root as Record<string, unknown>;
  let inner: unknown =
    o['data'] ?? o['Data'] ?? o['result'] ?? o['Result'] ?? root;
  if (inner == null) return null;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const io = inner as Record<string, unknown>;
    const nested = io['data'] ?? io['Data'] ?? io['value'] ?? io['Value'];
    if (nested != null && typeof nested === 'object' && !Array.isArray(nested)) {
      inner = nested;
    }
  }
  return inner && typeof inner === 'object' && !Array.isArray(inner)
    ? (inner as Record<string, unknown>)
    : null;
}

function pickNum(o: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && /^-?\d+$/.test(v)) return parseInt(v, 10);
  }
  return null;
}

function pickFloat(o: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() && /^-?\d+(\.\d+)?$/.test(v.trim())) {
      return parseFloat(v.trim());
    }
  }
  return null;
}

function pickStr(o: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

/**
 * `SortBy` query values — must match backend enum order.
 * Omit param for API default (typically newest first).
 */
export const CUSTOMER_SHIPMENT_SORT_OPTIONS: ReadonlyArray<{
  label: string;
  value: number | null;
}> = [
  { label: 'Default (newest)', value: null },
  { label: 'Oldest', value: 1 },
  { label: 'Items (fewest first)', value: 2 },
  { label: 'Items (most first)', value: 3 },
  { label: 'Price (low → high)', value: 4 },
  { label: 'Price (high → low)', value: 5 }
];

/**
 * `ShipmentStatus` filter — must match backend enum; omit for all.
 */
export const CUSTOMER_SHIPMENT_STATUS_OPTIONS: ReadonlyArray<{
  label: string;
  value: number | null;
}> = [
  { label: 'All statuses', value: null },
  { label: 'Placed', value: 0 },
  { label: 'Pending', value: 1 },
  { label: 'Processing', value: 2 },
  { label: 'Shipped', value: 3 },
  { label: 'Delivered', value: 4 },
  { label: 'Cancelled', value: 5 }
];
