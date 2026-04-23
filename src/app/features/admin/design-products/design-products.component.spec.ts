import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DesignProductsComponent } from './design-products.component';

describe('DesignProductsComponent', () => {
  let component: DesignProductsComponent;
  let fixture: ComponentFixture<DesignProductsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DesignProductsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DesignProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
