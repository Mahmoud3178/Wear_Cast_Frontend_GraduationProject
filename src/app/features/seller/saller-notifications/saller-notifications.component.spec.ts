import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SallerNotificationsComponent } from './saller-notifications.component';

describe('SallerNotificationsComponent', () => {
  let component: SallerNotificationsComponent;
  let fixture: ComponentFixture<SallerNotificationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SallerNotificationsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SallerNotificationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
