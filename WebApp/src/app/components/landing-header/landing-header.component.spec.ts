import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { createMockFirebaseAuth } from '../../../testing/mocks/firebase-auth.mock';
import { TokenService } from '@services/token.service';
import { AuthService } from '@services/auth.service';
import { CreatorSignInResponse } from '@app-types/onboarding';

import { LandingHeaderComponent } from './landing-header.component';

describe('LandingHeaderComponent', () => {
  let component: LandingHeaderComponent;
  let fixture: ComponentFixture<LandingHeaderComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockTokenService: jasmine.SpyObj<TokenService>;
  let creatorSignInSubject: BehaviorSubject<CreatorSignInResponse | null>;

  beforeEach(async () => {
    creatorSignInSubject = new BehaviorSubject<CreatorSignInResponse | null>(null);
    mockRouter = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], { events: of(), url: '/' });
    mockAuthService = jasmine.createSpyObj('AuthService', ['onLoginClick', 'signOut'], {
      user$: new BehaviorSubject(null),
      creatorSignInResponse$: creatorSignInSubject.asObservable(),
      accessToken$: new BehaviorSubject(null),
    });
    mockAuthService.onLoginClick.and.returnValue(Promise.resolve());
    mockTokenService = jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() });
    mockTokenService.getCurrentUserObj.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [LandingHeaderComponent, HttpClientTestingModule],
      providers: [
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: TokenService, useValue: mockTokenService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}), queryParams: of({}) } },
        { provide: AuthService, useValue: mockAuthService },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LandingHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.mobileMenuOpen).toBe(false);
    expect(component.isScrolled).toBe(false);
    expect(component.isDropdownOpen).toBe(false);
  });

  describe('onWindowScroll', () => {
    it('should set isScrolled to true when scrollY > 10', () => {
      // Simulate scroll by directly calling the handler
      Object.defineProperty(window, 'scrollY', { value: 50, configurable: true });
      component.onWindowScroll();
      expect(component.isScrolled).toBe(true);
    });

    it('should set isScrolled to false when scrollY <= 10', () => {
      Object.defineProperty(window, 'scrollY', { value: 5, configurable: true });
      component.onWindowScroll();
      expect(component.isScrolled).toBe(false);
    });
  });

  describe('onClickOutside', () => {
    it('should close dropdown when clicking outside', () => {
      component.isDropdownOpen = true;
      const mockEvent = {
        target: document.createElement('div'),
      } as unknown as MouseEvent;
      component.onClickOutside(mockEvent);
      expect(component.isDropdownOpen).toBe(false);
    });
  });

  describe('ngOnInit', () => {
    it('should subscribe to creatorSignInResponse$', () => {
      const mockResponse: CreatorSignInResponse = {
        success: true,
        message: 'ok',
        isCreator: true,
        isCoAdmin: false,
        hasAcceptedTerms: true,
      };
      creatorSignInSubject.next(mockResponse);
      expect(component.signInResponse).toEqual(mockResponse);
    });

    it('should call initializeUser and set user after authReady', async () => {
      await fixture.whenStable();
      expect(mockTokenService.getCurrentUserObj).toHaveBeenCalled();
    });
  });

  describe('onLoginClick', () => {
    it('should call authService.onLoginClick with landing_page', async () => {
      await component.onLoginClick();
      expect(mockAuthService.onLoginClick).toHaveBeenCalledWith('landing_page');
    });
  });

  describe('toggleMobileMenu', () => {
    it('should toggle mobileMenuOpen', () => {
      expect(component.mobileMenuOpen).toBe(false);
      component.toggleMobileMenu();
      expect(component.mobileMenuOpen).toBe(true);
      component.toggleMobileMenu();
      expect(component.mobileMenuOpen).toBe(false);
    });
  });

  describe('toggleDropdown', () => {
    it('should toggle isDropdownOpen', () => {
      expect(component.isDropdownOpen).toBe(false);
      component.toggleDropdown();
      expect(component.isDropdownOpen).toBe(true);
      component.toggleDropdown();
      expect(component.isDropdownOpen).toBe(false);
    });

    it('should stop propagation when event is provided', () => {
      const mockEvent = jasmine.createSpyObj('MouseEvent', ['stopPropagation']);
      component.toggleDropdown(mockEvent);
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('handleSignout', () => {
    it('should call authService.signOut and reset state', () => {
      component.user = { displayName: 'Test', email: 'test@test.com', photoURL: null };
      component.signInResponse = { success: true, message: '', isCreator: true, isCoAdmin: false, hasAcceptedTerms: true };
      component.mobileMenuOpen = true;
      component.isDropdownOpen = true;

      component.handleSignout();

      expect(mockAuthService.signOut).toHaveBeenCalled();
      expect(component.user).toBeNull();
      expect(component.signInResponse).toBeNull();
      expect(component.mobileMenuOpen).toBe(false);
      expect(component.isDropdownOpen).toBe(false);
    });
  });

  describe('isOnboardingComplete', () => {
    it('should return truthy when user is creator and has accepted terms', () => {
      component.signInResponse = {
        success: true,
        message: '',
        isCreator: true,
        isCoAdmin: false,
        hasAcceptedTerms: true,
      };
      expect(component.isOnboardingComplete).toBeTruthy();
    });

    it('should return falsy when not a creator', () => {
      component.signInResponse = {
        success: true,
        message: '',
        isCreator: false,
        isCoAdmin: false,
        hasAcceptedTerms: true,
      };
      expect(component.isOnboardingComplete).toBeFalsy();
    });

    it('should return falsy when signInResponse is null', () => {
      component.signInResponse = null;
      expect(component.isOnboardingComplete).toBeFalsy();
    });
  });

});
