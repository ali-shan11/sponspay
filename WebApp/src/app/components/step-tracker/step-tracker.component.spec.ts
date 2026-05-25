import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepTrackerComponent } from './step-tracker.component';

describe('StepTrackerComponent', () => {
  let component: StepTrackerComponent;
  let fixture: ComponentFixture<StepTrackerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepTrackerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepTrackerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
