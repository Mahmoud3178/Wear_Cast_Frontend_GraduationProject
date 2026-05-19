import { TestBed } from '@angular/core/testing';

import { NotificationsPollingService } from './notifications-polling.service';

describe('NotificationsPollingService', () => {
  let service: NotificationsPollingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationsPollingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
