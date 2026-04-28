import { TestBed } from '@angular/core/testing';

import { AllCustomersForAdminService } from './all-customers-for-admin.service';

describe('AllCustomersForAdminService', () => {
  let service: AllCustomersForAdminService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AllCustomersForAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
