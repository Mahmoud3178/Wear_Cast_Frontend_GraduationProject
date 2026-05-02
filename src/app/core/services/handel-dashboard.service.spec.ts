import { TestBed } from '@angular/core/testing';

import { HandelDashboardService } from './handel-dashboard.service';

describe('HandelDashboardService', () => {
  let service: HandelDashboardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HandelDashboardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
