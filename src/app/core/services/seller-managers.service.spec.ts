import { TestBed } from '@angular/core/testing';

import { SellerManagersService } from './seller-managers.service';

describe('SellerManagersService', () => {
  let service: SellerManagersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SellerManagersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
