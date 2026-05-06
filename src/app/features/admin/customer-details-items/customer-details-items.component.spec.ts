import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerDetailsItemsComponent } from './customer-details-items.component';

describe('CustomerDetailsItemsComponent', () => {
  let component: CustomerDetailsItemsComponent;
  let fixture: ComponentFixture<CustomerDetailsItemsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerDetailsItemsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomerDetailsItemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
