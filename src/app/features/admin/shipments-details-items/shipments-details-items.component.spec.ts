import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShipmentsDetailsItemsComponent } from './shipments-details-items.component';

describe('ShipmentsDetailsItemsComponent', () => {
  let component: ShipmentsDetailsItemsComponent;
  let fixture: ComponentFixture<ShipmentsDetailsItemsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShipmentsDetailsItemsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShipmentsDetailsItemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
