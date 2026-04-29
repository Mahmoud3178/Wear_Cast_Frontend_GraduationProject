import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SellerApllicationsComponent } from './seller-apllications.component';

describe('SellerApllicationsComponent', () => {
  let component: SellerApllicationsComponent;
  let fixture: ComponentFixture<SellerApllicationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SellerApllicationsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SellerApllicationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
