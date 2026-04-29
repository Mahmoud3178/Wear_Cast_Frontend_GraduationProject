import { TestBed } from '@angular/core/testing';

import { SellerApllicationsService } from './seller-apllications.service';

describe('SellerApllicationsService', () => {
  let service: SellerApllicationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SellerApllicationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
