import { TestBed } from '@angular/core/testing';

import { ShippingCompanyForAdminService } from './shipping-company-for-admin.service';

describe('ShippingCompanyForAdminService', () => {
  let service: ShippingCompanyForAdminService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShippingCompanyForAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
