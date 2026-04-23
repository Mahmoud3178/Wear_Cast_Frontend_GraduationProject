import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DesignProductDetailsComponent } from './design-product-details.component';

describe('DesignProductDetailsComponent', () => {
  let component: DesignProductDetailsComponent;
  let fixture: ComponentFixture<DesignProductDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DesignProductDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DesignProductDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
