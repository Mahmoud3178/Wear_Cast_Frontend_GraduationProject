import { TestBed } from '@angular/core/testing';

import { HandelShipmentsForAdminService } from './handel-shipments-for-admin.service';

describe('HandelShipmentsForAdminService', () => {
  let service: HandelShipmentsForAdminService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HandelShipmentsForAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
