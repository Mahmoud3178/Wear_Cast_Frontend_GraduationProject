import { TestBed } from '@angular/core/testing';

import { DashboardSellerService } from './dashboard-seller.service';

describe('DashboardSellerService', () => {
  let service: DashboardSellerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DashboardSellerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
