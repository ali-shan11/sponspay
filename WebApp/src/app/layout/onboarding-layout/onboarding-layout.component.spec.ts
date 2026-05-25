import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OnboardingLayoutComponent } from './onboarding-layout.component';

describe('OnboardingLayoutComponent', () => {
  let component: OnboardingLayoutComponent;
  let fixture: ComponentFixture<OnboardingLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnboardingLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OnboardingLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
