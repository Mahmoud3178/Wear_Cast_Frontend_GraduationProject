import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export const NOTIFICATION_SORT_NEWEST = 0;
export const NOTIFICATION_SORT_OLDEST = 1;

export interface NotificationListQuery {
  pageIndex?: number;
  pageSize?: number;
  sortBy?: number | null;
  isRead?: boolean | null;
  notificationType?: number;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  notificationType: number | string;
  isRead: boolean;
  urlId?: string;
  createdOn?: string;
  createdAt?: string;
}

export interface NotificationListResult {
  items: NotificationItem[];
  totalCount: number;
  totalPages: number;
  pageIndex: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly api = `${environment.apiUrl}/api/Notifications`;

  constructor(private readonly http: HttpClient) {}

  private get token(): string {
    return localStorage.getItem('token') || '';
  }

  private get headers(): { Authorization: string } {
    return { Authorization: `Bearer ${this.token}` };
  }

getAll(
  pageIndex = 1,
  pageSize = 20,
  notificationType?: number,
  isReadOrOptions?: boolean | Pick<NotificationListQuery, 'sortBy' | 'isRead'>
): Observable<unknown> {
  let isRead: boolean | null | undefined;
  let sortBy: number | null | undefined;

  if (typeof isReadOrOptions === 'boolean') {
    isRead = isReadOrOptions;
  } else {
    isRead = isReadOrOptions?.isRead;
    sortBy = isReadOrOptions?.sortBy;
  }

  return this.getAllQuery({
    pageIndex,
    pageSize,
    notificationType,
    sortBy,
    isRead
  });
}

  getAllQuery(query: NotificationListQuery = {}): Observable<unknown> {
    let params = new HttpParams()
      .set('PageIndex', String(query.pageIndex ?? 1))
      .set('PageSize', String(query.pageSize ?? 20));

    if (query.sortBy !== undefined && query.sortBy !== null) {
      params = params.set('SortBy', String(query.sortBy));
    }
    if (query.isRead !== undefined && query.isRead !== null) {
      params = params.set('IsRead', String(query.isRead));
    }
    if (query.notificationType !== undefined) {
      params = params.set('NotificationType', String(query.notificationType));
    }

    return this.http.get(`${this.api}/GetAll`, { params, headers: this.headers });
  }

  getUndeliveredCount(): Observable<unknown> {
    return this.http.get(`${this.api}/UndeliveredCount`, { headers: this.headers });
  }

  markAsRead(notificationId: number): Observable<unknown> {
    return this.http.put(`${this.api}/Read/${notificationId}`, {}, { headers: this.headers });
  }

  markAllAsRead(): Observable<unknown> {
    return this.http.put(`${this.api}/ReadAll`, {}, { headers: this.headers });
  }

  receiveAll(): Observable<unknown> {
    return this.http.put(`${this.api}/ReceiveAll`, {}, { headers: this.headers });
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.api}/Delete/${id}`, { headers: this.headers });
  }

  /** Normalize API list payloads (`items`, nested `data`, PascalCase). */
  parseListResponse(res: unknown): NotificationListResult {
    const root = unwrapRecord(res);
    const data = unwrapRecord(root?.['data'] ?? root?.['Data'] ?? root) ?? root;
    const rawItems =
      data?.['items'] ??
      data?.['Items'] ??
      (Array.isArray(data) ? data : Array.isArray(root) ? root : []);

    const items = (Array.isArray(rawItems) ? rawItems : []).map(row =>
      normalizeNotification(row)
    );

    const totalCount = num(data?.['totalCount'] ?? data?.['TotalCount'] ?? data?.['records'] ?? data?.['Records']) ?? items.length;
    const pageSize = num(data?.['pageSize'] ?? data?.['PageSize']) ?? 20;
    const pageIndex = num(data?.['pageIndex'] ?? data?.['PageIndex']) ?? 1;
    const totalPages =
      num(data?.['totalPages'] ?? data?.['TotalPages'] ?? data?.['pages'] ?? data?.['Pages']) ??
      Math.max(1, Math.ceil(totalCount / Math.max(pageSize, 1)));

    return { items, totalCount, totalPages, pageIndex, pageSize };
  }

  parseUndeliveredCount(res: unknown): number {
    const root = unwrapRecord(res);
    const data = root?.['data'] ?? root?.['Data'] ?? root;
    if (typeof data === 'number' && Number.isFinite(data)) {
      return data;
    }
    const nested = unwrapRecord(data);
    const count =
      nested?.['count'] ??
      nested?.['Count'] ??
      nested?.['undeliveredCount'] ??
      nested?.['UndeliveredCount'];
    if (typeof count === 'number' && Number.isFinite(count)) {
      return count;
    }
    if (typeof root?.['count'] === 'number') {
      return root['count'] as number;
    }
    return 0;
  }
}

function unwrapRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeNotification(row: unknown): NotificationItem {
  const o = unwrapRecord(row) ?? {};
  const rawUrlId = o['urlId'] ?? o['UrlId'];
  return {
    id: num(o['id'] ?? o['Id']) ?? 0,
    title: String(o['title'] ?? o['Title'] ?? 'Notification'),
    message: String(o['message'] ?? o['Message'] ?? ''),
    notificationType: (o['notificationType'] ?? o['NotificationType'] ?? 0) as string | number,
    isRead: Boolean(o['isRead'] ?? o['IsRead']),
    urlId: rawUrlId !== null && rawUrlId !== undefined ? String(rawUrlId) : undefined,
    createdOn: String(o['createdOn'] ?? o['CreatedOn'] ?? o['createdAt'] ?? o['CreatedAt'] ?? ''),
    createdAt: String(o['createdAt'] ?? o['CreatedAt'] ?? o['createdOn'] ?? o['CreatedOn'] ?? '')
  };
}
