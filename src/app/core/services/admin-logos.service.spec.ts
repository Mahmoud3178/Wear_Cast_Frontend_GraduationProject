import { TestBed } from '@angular/core/testing';

import { AdminLogosService } from './admin-logos.service';

describe('AdminLogosService', () => {
  let service: AdminLogosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminLogosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
