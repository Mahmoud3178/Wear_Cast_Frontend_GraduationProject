import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationsDriversComponent } from './notifications-drivers.component';

describe('NotificationsDriversComponent', () => {
  let component: NotificationsDriversComponent;
  let fixture: ComponentFixture<NotificationsDriversComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationsDriversComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationsDriversComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
