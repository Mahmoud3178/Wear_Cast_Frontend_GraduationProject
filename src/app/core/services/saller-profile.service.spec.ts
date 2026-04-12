import { TestBed } from '@angular/core/testing';

import { SallerProfileService } from './saller-profile.service';

describe('SallerProfileService', () => {
  let service: SallerProfileService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SallerProfileService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
