import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { createMockFirebaseAuth } from '../../../../testing/mocks/firebase-auth.mock';
import { createMockHttpClient } from '../../../../testing/mocks/http.mock';
import { TokenService } from '@services/token.service';
import { AuthService } from '@services/auth.service';
import { OnboardingService } from '@services/onboarding.service';

import { CancellationComponent } from './cancellation.component';

describe('CancellationComponent', () => {
  let component: CancellationComponent;
  let fixture: ComponentFixture<CancellationComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockOnboardingService: jasmine.SpyObj<OnboardingService>;
  let userSubject: BehaviorSubject<any>;

  beforeEach(async () => {
    userSubject = new BehaviorSubject<any>(null);
    mockRouter = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], { events: of(), url: '/' });
    mockAuthService = jasmine.createSpyObj('AuthService', ['signOut', 'onLoginClick'], {
      user$: userSubject.asObservable(),
      creatorSignInResponse$: new BehaviorSubject(null),
      accessToken$: new BehaviorSubject(null),
    });
    mockOnboardingService = jasmine.createSpyObj('OnboardingService', ['cancelOnboarding']);

    await TestBed.configureTestingModule({
      imports: [CancellationComponent],
      providers: [
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: HttpClient, useValue: createMockHttpClient() },
        { provide: TokenService, useValue: jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() }) },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}), queryParams: of({}) } },
        { provide: AuthService, useValue: mockAuthService },
        { provide: OnboardingService, useValue: mockOnboardingService },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CancellationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.currentStep).toBe(0);
    expect(component.isLoading).toBe(false);
    expect(component.reason).toBe('');
    expect(component.keepMeUpdated).toBe(false);
  });

  describe('ngOnInit', () => {
    it('should subscribe to user$ and set user when emitted', () => {
      const mockUser = { uid: 'test-uid', email: 'test@test.com' };
      userSubject.next(mockUser);
      expect(component.user).toEqual(mockUser as any);
    });

    it('should set user to null when user$ emits null', () => {
      userSubject.next(null);
      expect(component.user).toBeNull();
    });
  });

  describe('onBackClick', () => {
    it('should navigate to /onboarding', () => {
      component.onBackClick();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/onboarding']);
    });
  });

  describe('handleReasonChange', () => {
    it('should update reason and keepMeUpdated from event', () => {
      const event = { reason: 'Too expensive', keepMeUpdated: true };
      component.handleReasonChange(event);
      expect(component.reason).toBe('Too expensive');
      expect(component.keepMeUpdated).toBe(true);
    });

    it('should handle empty reason', () => {
      const event = { reason: '', keepMeUpdated: false };
      component.handleReasonChange(event);
      expect(component.reason).toBe('');
      expect(component.keepMeUpdated).toBe(false);
    });
  });

  describe('cancel', () => {
    it('should call cancelOnboarding and increment step on success', fakeAsync(() => {
      component.reason = 'Not interested';
      component.keepMeUpdated = true;
      mockOnboardingService.cancelOnboarding.and.returnValue(of({}));

      component.cancel();

      expect(component.isLoading).toBe(true);
      expect(mockOnboardingService.cancelOnboarding).toHaveBeenCalledWith({
        reason: 'Not interested',
        wantsUpdates: true,
      });
      expect(component.currentStep).toBe(1);

      tick(2000);
      expect(mockAuthService.signOut).toHaveBeenCalled();
    }));

    it('should set isLoading to true when cancel is called', () => {
      mockOnboardingService.cancelOnboarding.and.returnValue(of({}));
      component.cancel();
      expect(component.isLoading).toBe(true);
    });
  });

  describe('handleSignout', () => {
    it('should call authService.signOut', () => {
      component.handleSignout();
      expect(mockAuthService.signOut).toHaveBeenCalled();
    });
  });
});
