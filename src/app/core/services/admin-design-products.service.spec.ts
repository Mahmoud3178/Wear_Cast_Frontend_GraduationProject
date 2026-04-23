import { TestBed } from '@angular/core/testing';

import { AdminDesignProductsService } from './admin-design-products.service';

describe('AdminDesignProductsService', () => {
  let service: AdminDesignProductsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminDesignProductsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
