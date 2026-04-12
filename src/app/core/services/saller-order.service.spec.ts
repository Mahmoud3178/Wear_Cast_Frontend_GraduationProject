import { TestBed } from '@angular/core/testing';

import { SallerOrderService } from './saller-order.service';

describe('SallerOrderService', () => {
  let service: SallerOrderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SallerOrderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
