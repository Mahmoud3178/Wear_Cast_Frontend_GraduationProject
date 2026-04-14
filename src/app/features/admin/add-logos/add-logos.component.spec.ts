import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddLogosComponent } from './add-logos.component';

describe('AddLogosComponent', () => {
  let component: AddLogosComponent;
  let fixture: ComponentFixture<AddLogosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddLogosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddLogosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
