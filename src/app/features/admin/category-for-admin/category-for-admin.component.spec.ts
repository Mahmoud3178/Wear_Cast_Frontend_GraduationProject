import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoryForAdminComponent } from './category-for-admin.component';

describe('CategoryForAdminComponent', () => {
  let component: CategoryForAdminComponent;
  let fixture: ComponentFixture<CategoryForAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryForAdminComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CategoryForAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
