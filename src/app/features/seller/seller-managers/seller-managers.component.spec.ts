import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SellerManagersComponent } from './seller-managers.component';

describe('SellerManagersComponent', () => {
  let component: SellerManagersComponent;
  let fixture: ComponentFixture<SellerManagersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SellerManagersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SellerManagersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
