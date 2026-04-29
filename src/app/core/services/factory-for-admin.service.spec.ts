import { TestBed } from '@angular/core/testing';

import { FactoryForAdminService } from './factory-for-admin.service';

describe('FactoryForAdminService', () => {
  let service: FactoryForAdminService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FactoryForAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
