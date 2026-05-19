import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationsShippingComponent } from './notifications-shipping.component';

describe('NotificationsShippingComponent', () => {
  let component: NotificationsShippingComponent;
  let fixture: ComponentFixture<NotificationsShippingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationsShippingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationsShippingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
