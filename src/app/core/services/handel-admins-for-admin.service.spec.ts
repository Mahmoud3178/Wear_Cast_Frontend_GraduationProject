import { TestBed } from '@angular/core/testing';

import { HandelAdminsForAdminService } from './handel-admins-for-admin.service';

describe('HandelAdminsForAdminService', () => {
  let service: HandelAdminsForAdminService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HandelAdminsForAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
