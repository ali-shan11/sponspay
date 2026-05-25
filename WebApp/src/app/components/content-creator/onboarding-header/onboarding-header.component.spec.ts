import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { OnboardingHeaderComponent } from './onboarding-header.component';

describe('OnboardingHeaderComponent', () => {
  let component: OnboardingHeaderComponent;
  let fixture: ComponentFixture<OnboardingHeaderComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [OnboardingHeaderComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OnboardingHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have svgIcon defined', () => {
    expect(component.svgIcon).toBeTruthy();
  });

  describe('goHome', () => {
    it('should navigate to root path', () => {
      component.goHome();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });
  });
});
