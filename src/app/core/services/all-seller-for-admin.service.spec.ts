import { TestBed } from '@angular/core/testing';

import { AllSellerForAdminService } from './all-seller-for-admin.service';

describe('AllSellerForAdminService', () => {
  let service: AllSellerForAdminService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AllSellerForAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
