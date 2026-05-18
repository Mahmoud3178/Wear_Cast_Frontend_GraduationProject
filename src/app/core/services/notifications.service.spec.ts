import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import {
  NOTIFICATION_SORT_NEWEST,
  NOTIFICATION_SORT_OLDEST,
  NotificationsService
} from './notifications.service';
import { environment } from '../../../environments/environment';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(NotificationsService);
    http = TestBed.inject(HttpTestingController);
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('token');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAllQuery should send SortBy, IsRead, and NotificationType', () => {
    service
      .getAllQuery({
        pageIndex: 2,
        pageSize: 10,
        sortBy: NOTIFICATION_SORT_OLDEST,
        isRead: false,
        notificationType: 1
      })
      .subscribe();

    const req = http.expectOne(r => r.url.includes('/api/Notifications/GetAll'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('PageIndex')).toBe('2');
    expect(req.request.params.get('PageSize')).toBe('10');
    expect(req.request.params.get('SortBy')).toBe(String(NOTIFICATION_SORT_OLDEST));
    expect(req.request.params.get('IsRead')).toBe('false');
    expect(req.request.params.get('NotificationType')).toBe('1');
    req.flush({ items: [] });
  });

  it('parseListResponse should read nested data.items', () => {
    const result = service.parseListResponse({
      data: {
        items: [
          {
            id: 5,
            title: 'Hello',
            message: 'World',
            notificationType: 1,
            isRead: false,
            createdOn: '2026-01-01T00:00:00Z'
          }
        ],
        totalCount: 1,
        totalPages: 1,
        pageIndex: 1,
        pageSize: 20
      }
    });
    expect(result.items.length).toBe(1);
    expect(result.items[0].title).toBe('Hello');
    expect(result.totalCount).toBe(1);
  });

  it('parseUndeliveredCount should handle count in data', () => {
    expect(service.parseUndeliveredCount({ count: 3 })).toBe(3);
    expect(service.parseUndeliveredCount({ data: { count: 7 } })).toBe(7);
  });

  it('NOTIFICATION_SORT constants should define Newest and Oldest', () => {
    expect(NOTIFICATION_SORT_NEWEST).toBe(0);
    expect(NOTIFICATION_SORT_OLDEST).toBe(1);
  });
});
