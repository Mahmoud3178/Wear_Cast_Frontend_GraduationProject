import { TestBed } from '@angular/core/testing';

import { HandelCategoryesForAdminService } from './handel-categoryes-for-admin.service';

describe('HandelCategoryesForAdminService', () => {
  let service: HandelCategoryesForAdminService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HandelCategoryesForAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
