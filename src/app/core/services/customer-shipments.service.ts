import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { normalizeWearCastApiDateToIso } from '../utils/api-date';
import { ShipmentStatus } from '../models/shipment.model';

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
  shipmentStatus: number | null;
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
  kind: 'fixed' | 'designed';
  productId: number | null;
  designedProductId: number | null;
  customerDesignId: number | null;
  colorName: string | null;
  frontImageUrl: string | null;
  backImageUrl: string | null;
  rightImageUrl: string | null;
  leftImageUrl: string | null;
  galleryImageUrls: string[];
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
  /** Pickup / drop-off PIN or OTP shown when the carrier assigns delivery. */
  deliveryCode: string | null;
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
  ) { }

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

  /** GET /api/Orders/shipment/{shipmentId}/items */
  getShipmentOrderItems(shipmentId: number): Observable<CustomerShipmentOrderLineVm[]> {
    const url = `${this.base}/api/Orders/shipment/${shipmentId}/items`;
    return this.http.get<unknown>(url, { ...this.authOpts() }).pipe(
      map(body => normalizeShipmentOrderItems(body)),
      catchError(() => of([]))
    );
  }

  getShipmentDetailWithItems(
    shipmentId: number,
    shipmentRow?: CustomerShipmentRow
  ): Observable<CustomerShipmentDetailVm | null> {
    return forkJoin({
      detail: this.getShipmentById(shipmentId),
      items: this.getShipmentOrderItems(shipmentId)
    }).pipe(
      map(({ detail, items }) => {
        if (!detail) {
          return mergeShipmentItemsIntoFallback(shipmentId, items, shipmentRow);
        }
        const mergedLines = items.length > 0 ? items : detail.orderLines;
        const detailTotal =
          detail.price > 0
            ? detail.price
            : computeShipmentTotalFromLines(mergedLines);
        return {
          ...detail,
          price: detailTotal,
          shipmentStatus:
            detail.shipmentStatus ?? shipmentRow?.status ?? null,
          orderedAt: detail.orderedAt ?? shipmentRow?.createdAt ?? null,
          orderLines: mergedLines
        };
      }),
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
  const statusVal = o['status'] ?? o['Status'] ?? o['shipmentStatus'] ?? o['ShipmentStatus'];
  const status = parseStatus(statusVal);
  const createdAt =
    pickDateIso(o, [
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
    shipmentStatus: status ?? null,
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
  const statusVal = raw['shipmentStatus'] ?? raw['ShipmentStatus'] ?? raw['status'] ?? raw['Status'];
  const shipmentStatus = parseStatus(statusVal);
  const orderedAt =
    pickDateIso(raw, ['orderedAt', 'OrderedAt', 'createdAt', 'CreatedAt']) || null;
  const deliveryCodeRaw = pickStr(raw, [
    'deliveryCode',
    'DeliveryCode',
    'delivery_code',
    'otp',
    'Otp',
    'pickupCode',
    'PickupCode',
    'pin',
    'Pin'
  ]);
  const deliveryCode = deliveryCodeRaw ? deliveryCodeRaw : null;
  const deliveryAddress = parseDeliveryAddressVm(raw);
  const driverName = pickStr(raw, ['driverName', 'DriverName']) || null;
  const driverPhone =
    pickStr(raw, ['driverPhoneNumber', 'DriverPhoneNumber', 'driverPhone', 'DriverPhone']) ||
    null;
  const timeline: CustomerShipmentTimelineEntryVm[] = [
    { label: 'Ordered', at: pickIso(raw, ['orderedAt', 'OrderedAt']) },
    {
      label: 'Ready for pickup',
      at: pickIso(raw, ['readyForPickupAt', 'ReadyForPickupAt', 'readyForPickUpAt', 'ReadyForPickUpAt'])
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
    deliveryCode,
    deliveryAddress,
    driverName: driverName || null,
    driverPhoneNumber: driverPhone || null,
    timeline,
    orderLines
  };
}

function normalizeShipmentOrderItems(root: unknown): CustomerShipmentOrderLineVm[] {
  const list = unwrapShipmentItemsArray(root);
  const orderLines: CustomerShipmentOrderLineVm[] = [];
  for (const rawItem of list) {
    const line = mapShipmentOrderLine(rawItem);
    if (line) orderLines.push(line);
  }
  return orderLines;
}

function unwrapShipmentItemsArray(root: unknown): unknown[] {
  if (Array.isArray(root)) {
    return root;
  }
  if (!root || typeof root !== 'object') {
    return [];
  }
  const source = root as Record<string, unknown>;
  const payload =
    source['data'] ??
    source['Data'] ??
    source['result'] ??
    source['Result'] ??
    root;

  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const p = payload as Record<string, unknown>;
  const itemsRoot =
    p['items'] ??
    p['Items'] ??
    p['orderItems'] ??
    p['OrderItems'] ??
    p['lines'] ??
    p['Lines'] ??
    p['data'] ??
    p['Data'];

  if (Array.isArray(itemsRoot)) {
    return itemsRoot;
  }

  // Some APIs return grouped payload:
  // { fixedItems: { items: [...] }, designedItems: { items: [...] } }
  const fixedItemsBox = p['fixedItems'] ?? p['FixedItems'];
  const designedItemsBox = p['designedItems'] ?? p['DesignedItems'];
  const grouped: unknown[] = [];
  if (fixedItemsBox && typeof fixedItemsBox === 'object' && !Array.isArray(fixedItemsBox)) {
    const fb = fixedItemsBox as Record<string, unknown>;
    const arr = fb['items'] ?? fb['Items'];
    if (Array.isArray(arr)) {
      grouped.push(...arr);
    }
  }
  if (
    designedItemsBox &&
    typeof designedItemsBox === 'object' &&
    !Array.isArray(designedItemsBox)
  ) {
    const db = designedItemsBox as Record<string, unknown>;
    const arr = db['items'] ?? db['Items'];
    if (Array.isArray(arr)) {
      grouped.push(...arr);
    }
  }
  if (grouped.length > 0) {
    return grouped;
  }
  return [];
}

function computeShipmentTotalFromLines(lines: CustomerShipmentOrderLineVm[]): number {
  return lines.reduce((sum, line) => {
    if (line.lineTotal != null) return sum + line.lineTotal;
    if (line.unitPrice != null) return sum + line.unitPrice * line.quantity;
    return sum;
  }, 0);
}

function mergeShipmentItemsIntoFallback(
  shipmentId: number,
  items: CustomerShipmentOrderLineVm[],
  shipmentRow?: CustomerShipmentRow
): CustomerShipmentDetailVm {
  const totalFromItems = computeShipmentTotalFromLines(items);
  return {
    id: shipmentId,
    price: shipmentRow?.total ?? totalFromItems,
    shipmentStatus: shipmentRow?.status ?? null,
    orderedAt: shipmentRow?.createdAt ?? null,
    deliveryCode: null,
    deliveryAddress: null,
    driverName: null,
    driverPhoneNumber: null,
    timeline: [
      { label: 'Ordered', at: shipmentRow?.createdAt ?? null },
      { label: 'Ready for pickup', at: null },
      { label: 'Trip started', at: null },
      { label: 'Out for delivery', at: null },
      { label: 'Delivered', at: null }
    ],
    orderLines: items
  };
}

function pickIso(o: Record<string, unknown>, keys: string[]): string | null {
  return pickDateIso(o, keys);
}

function pickDateIso(o: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    if (!(k in o)) continue;
    const v = o[k];
    if (v == null) continue;
    const iso = normalizeWearCastApiDateToIso(v);
    if (iso) return iso;
  }
  return null;
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
  const qRaw =
    pickNum(src, ['quantity', 'Quantity', 'totalQuantity', 'TotalQuantity']) ??
    pickNum(o, ['quantity', 'Quantity', 'totalQuantity', 'TotalQuantity']);
  const quantity = qRaw != null && qRaw > 0 ? qRaw : 1;
  const unitPrice =
    pickFloat(src, ['unitPrice', 'UnitPrice', 'price', 'Price']) ??
    pickFloat(o, ['unitPrice', 'UnitPrice', 'price', 'Price']);
  const lineTotal =
    pickFloat(src, ['lineTotal', 'LineTotal', 'total', 'Total', 'subTotal', 'SubTotal']) ??
    pickFloat(o, ['lineTotal', 'LineTotal', 'total', 'Total']);
  const imageUrl =
    pickStr(src, [
      'frontImageUrl',
      'FrontImageUrl',
      'image',
      'Image',
      'imageUrl',
      'ImageUrl',
      'thumbnailUrl',
      'ThumbnailUrl',
      'mainImageUrl',
      'MainImageUrl'
    ]) ||
    pickStr(o, ['imageUrl', 'ImageUrl']) ||
    null;
  const frontImageUrl =
    pickStr(src, ['frontImageUrl', 'FrontImageUrl']) ||
    pickStr(o, ['frontImageUrl', 'FrontImageUrl']) ||
    null;
  const backImageUrl =
    pickStr(src, ['backImageUrl', 'BackImageUrl']) ||
    pickStr(o, ['backImageUrl', 'BackImageUrl']) ||
    null;
  const rightImageUrl =
    pickStr(src, ['rightImageUrl', 'RightImageUrl']) ||
    pickStr(o, ['rightImageUrl', 'RightImageUrl']) ||
    null;
  const leftImageUrl =
    pickStr(src, ['leftImageUrl', 'LeftImageUrl']) ||
    pickStr(o, ['leftImageUrl', 'LeftImageUrl']) ||
    null;
  const colorName =
    pickStr(src, ['colorName', 'ColorName']) || pickStr(o, ['colorName', 'ColorName']) || null;
  const galleryImageUrls = [
    frontImageUrl,
    backImageUrl,
    rightImageUrl,
    leftImageUrl,
    imageUrl
  ].filter((u, idx, arr): u is string => !!u && arr.indexOf(u) === idx);
  const sizesRaw = src['sizes'] ?? src['Sizes'] ?? o['sizes'] ?? o['Sizes'];
  const sizesLabel = buildSizesLabel(sizesRaw);
  const productId =
    pickNum(src, ['productId', 'ProductId']) ?? pickNum(o, ['productId', 'ProductId']);
  const designedProductId =
    pickNum(src, ['designedProductId', 'DesignedProductId']) ??
    pickNum(o, ['designedProductId', 'DesignedProductId']);
  const customerDesignId =
    pickNum(src, ['customerDesignId', 'CustomerDesignId']) ??
    pickNum(o, ['customerDesignId', 'CustomerDesignId']);
  const kind: 'fixed' | 'designed' =
    designedProductId != null || customerDesignId != null ? 'designed' : 'fixed';
  return {
    kind,
    productId: productId ?? null,
    designedProductId: designedProductId ?? null,
    customerDesignId: customerDesignId ?? null,
    colorName: colorName || null,
    frontImageUrl: frontImageUrl || null,
    backImageUrl: backImageUrl || null,
    rightImageUrl: rightImageUrl || null,
    leftImageUrl: leftImageUrl || null,
    galleryImageUrls,
    title,
    subtitle: sizesLabel || subtitle,
    quantity: Math.max(1, quantity),
    unitPrice: unitPrice ?? null,
    lineTotal: lineTotal ?? null,
    imageUrl: imageUrl || null
  };
}

function buildSizesLabel(sizesRaw: unknown): string {
  if (!Array.isArray(sizesRaw) || sizesRaw.length === 0) {
    return '';
  }
  const parts: string[] = [];
  for (const row of sizesRaw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const sizeName =
      pickStr(o, ['sizeName', 'SizeName', 'size', 'Size']).replace(/^_/, '') || '';
    const qty = pickNum(o, ['quantity', 'Quantity']) ?? 0;
    if (!sizeName) continue;
    parts.push(qty > 0 ? `${sizeName} x${qty}` : sizeName);
  }
  return parts.join(', ');
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

function parseStatus(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    if (/^-?\d+$/.test(v)) return parseInt(v, 10);
    const mapped = ShipmentStatus[v as keyof typeof ShipmentStatus];
    if (typeof mapped === 'number') return mapped;
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
    if (typeof v === 'number' && Number.isFinite(v)) return String(Math.trunc(v));
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
 * Backend: Pending=1, Unassigned=2, Assigned=3, PickingUp=4, OutForDelivery=5, Delivered=6
 */
export const CUSTOMER_SHIPMENT_STATUS_OPTIONS: ReadonlyArray<{
  label: string;
  value: number | null;
}> = [
  { label: 'All statuses', value: null },
  { label: 'Pending', value: 1 },
  { label: 'Unassigned', value: 2 },
  { label: 'Assigned', value: 3 },
  { label: 'PickingUp', value: 4 },
  { label: 'OutForDelivery', value: 5 },
  { label: 'Delivered', value: 6 }
];
