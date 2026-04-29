import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoryForProductsComponent } from './category-for-products.component';

describe('CategoryForProductsComponent', () => {
  let component: CategoryForProductsComponent;
  let fixture: ComponentFixture<CategoryForProductsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryForProductsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CategoryForProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
