import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { createMockFirebaseAuth } from '../../../../../testing/mocks/firebase-auth.mock';
import { createMockHttpClient } from '../../../../../testing/mocks/http.mock';
import { TokenService } from '@services/token.service';
import { AuthService } from '@services/auth.service';
import { DashboardService } from '@services/dashboard.service';
import { CreatorSignInResponse } from '@app-types/onboarding';

import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService> & { creatorSignInResponse$: BehaviorSubject<CreatorSignInResponse | null> };
  let mockDashboardService: { selectedDaysObservable: BehaviorSubject<number>; refresh$: Subject<void>; triggerRefresh: jasmine.Spy };
  let creatorSignInSubject: BehaviorSubject<CreatorSignInResponse | null>;

  beforeEach(async () => {
    creatorSignInSubject = new BehaviorSubject<CreatorSignInResponse | null>(null);

    mockAuthService = jasmine.createSpyObj('AuthService', [
      'getCurrentUser',
      'getStoredToken',
      'ensureValidToken',
      'getSignInResponse',
    ], {
      user$: new BehaviorSubject(null),
      accessToken$: new BehaviorSubject(null),
      creatorSignInResponse$: creatorSignInSubject,
    }) as jasmine.SpyObj<AuthService> & { creatorSignInResponse$: BehaviorSubject<CreatorSignInResponse | null> };

    mockDashboardService = {
      selectedDaysObservable: new BehaviorSubject<number>(30),
      refresh$: new Subject<void>(),
      triggerRefresh: jasmine.createSpy('triggerRefresh'),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: HttpClient, useValue: createMockHttpClient() },
        { provide: TokenService, useValue: jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() }) },
        { provide: AuthService, useValue: mockAuthService },
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], { events: of(), url: '/' }) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}), queryParams: of({}) } },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call subSignInResponse on init', () => {
      spyOn(component, 'subSignInResponse');
      component.ngOnInit();
      expect(component.subSignInResponse).toHaveBeenCalled();
    });
  });

  describe('onClickOutside', () => {
    it('should close both dropdowns when event has a target', () => {
      component.isDaysDropdownOpen = true;
      component.isChannelDropdownOpen = true;

      const mockEvent = { target: document.createElement('div') } as unknown as MouseEvent;
      component.onClickOutside(mockEvent);

      expect(component.isDaysDropdownOpen).toBeFalse();
      expect(component.isChannelDropdownOpen).toBeFalse();
    });

    it('should close dropdowns even when they are already closed', () => {
      component.isDaysDropdownOpen = false;
      component.isChannelDropdownOpen = false;

      const mockEvent = { target: document.createElement('div') } as unknown as MouseEvent;
      component.onClickOutside(mockEvent);

      expect(component.isDaysDropdownOpen).toBeFalse();
      expect(component.isChannelDropdownOpen).toBeFalse();
    });

    it('should not close dropdowns if event has no target', () => {
      component.isDaysDropdownOpen = true;
      component.isChannelDropdownOpen = true;

      const mockEvent = { target: null } as unknown as MouseEvent;
      component.onClickOutside(mockEvent);

      expect(component.isDaysDropdownOpen).toBeTrue();
      expect(component.isChannelDropdownOpen).toBeTrue();
    });

    it('should not close dropdowns if event is null-like (falsy event check)', () => {
      component.isDaysDropdownOpen = true;
      component.isChannelDropdownOpen = true;

      // The condition checks `event && event.target`, so falsy event skips
      const mockEvent = null as unknown as MouseEvent;
      component.onClickOutside(mockEvent);

      expect(component.isDaysDropdownOpen).toBeTrue();
      expect(component.isChannelDropdownOpen).toBeTrue();
    });
  });

  describe('subSignInResponse', () => {
    it('should set signInResponse when auth service emits a value', () => {
      const mockResponse: CreatorSignInResponse = {
        success: true,
        message: 'OK',
        isCreator: true,
        isCoAdmin: true,
        hasAcceptedTerms: true,
      };

      creatorSignInSubject.next(mockResponse);

      expect(component.signInResponse).toEqual(mockResponse);
    });

    it('should set signInResponse to null when auth service emits null', () => {
      // First set a value
      const mockResponse: CreatorSignInResponse = {
        success: true,
        message: 'OK',
        isCreator: true,
        isCoAdmin: false,
        hasAcceptedTerms: true,
      };
      creatorSignInSubject.next(mockResponse);
      expect(component.signInResponse).toEqual(mockResponse);

      // Then emit null
      creatorSignInSubject.next(null);
      expect(component.signInResponse).toBeNull();
    });
  });

  describe('toggleDropdown', () => {
    it('should open the days dropdown when it is closed', () => {
      component.isDaysDropdownOpen = false;
      const mockEvent = jasmine.createSpyObj('MouseEvent', ['stopPropagation']);

      component.toggleDropdown(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(component.isDaysDropdownOpen).toBeTrue();
    });

    it('should close the days dropdown when it is open', () => {
      component.isDaysDropdownOpen = true;
      const mockEvent = jasmine.createSpyObj('MouseEvent', ['stopPropagation']);

      component.toggleDropdown(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(component.isDaysDropdownOpen).toBeFalse();
    });

    it('should call stopPropagation on the event', () => {
      const mockEvent = jasmine.createSpyObj('MouseEvent', ['stopPropagation']);

      component.toggleDropdown(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalledTimes(1);
    });
  });

  describe('onDayOptionClick', () => {
    it('should toggle the days dropdown', () => {
      component.isDaysDropdownOpen = true;

      component.onDayOptionClick(7);

      expect(component.isDaysDropdownOpen).toBeFalse();
    });

    it('should open the days dropdown if it was closed', () => {
      component.isDaysDropdownOpen = false;

      component.onDayOptionClick(7);

      expect(component.isDaysDropdownOpen).toBeTrue();
    });

    it('should emit the selected days value to the dashboard service', () => {
      spyOn(mockDashboardService.selectedDaysObservable, 'next');

      component.onDayOptionClick(90);

      expect(mockDashboardService.selectedDaysObservable.next).toHaveBeenCalledWith(90);
    });

    it('should emit 1 for Today option', () => {
      spyOn(mockDashboardService.selectedDaysObservable, 'next');

      component.onDayOptionClick(1);

      expect(mockDashboardService.selectedDaysObservable.next).toHaveBeenCalledWith(1);
    });

    it('should emit 365 for This Year option', () => {
      spyOn(mockDashboardService.selectedDaysObservable, 'next');

      component.onDayOptionClick(365);

      expect(mockDashboardService.selectedDaysObservable.next).toHaveBeenCalledWith(365);
    });
  });

  describe('selectedDaysOption getter', () => {
    it('should return the matching option for the default value (30)', () => {
      // Default selectedDaysObservable is 30
      const result = component.selectedDaysOption;

      expect(result).toEqual({ text: 'Last 30 Days', value: 30 });
    });

    it('should return the correct option when value is 1 (Today)', () => {
      mockDashboardService.selectedDaysObservable.next(1);

      const result = component.selectedDaysOption;

      expect(result).toEqual({ text: 'Today', value: 1 });
    });

    it('should return the correct option when value is 7 (This Week)', () => {
      mockDashboardService.selectedDaysObservable.next(7);

      const result = component.selectedDaysOption;

      expect(result).toEqual({ text: 'This Week', value: 7 });
    });

    it('should return the correct option when value is 365 (This Year)', () => {
      mockDashboardService.selectedDaysObservable.next(365);

      const result = component.selectedDaysOption;

      expect(result).toEqual({ text: 'This Year', value: 365 });
    });

    it('should return undefined when no matching option exists', () => {
      mockDashboardService.selectedDaysObservable.next(999);

      const result = component.selectedDaysOption;

      expect(result).toBeUndefined();
    });
  });

  describe('isTelegramConnected getter', () => {
    it('should return falsy when signInResponse is null', () => {
      component.signInResponse = null;

      expect(component.isTelegramConnected).toBeFalsy();
    });

    it('should return true when isCreator and isCoAdmin are both true', () => {
      component.signInResponse = {
        success: true,
        message: 'OK',
        isCreator: true,
        isCoAdmin: true,
        hasAcceptedTerms: true,
      };

      expect(component.isTelegramConnected).toBeTrue();
    });

    it('should return false when isCreator is true but isCoAdmin is false', () => {
      component.signInResponse = {
        success: true,
        message: 'OK',
        isCreator: true,
        isCoAdmin: false,
        hasAcceptedTerms: true,
      };

      expect(component.isTelegramConnected).toBeFalsy();
    });

    it('should return false when isCreator is false but isCoAdmin is true', () => {
      component.signInResponse = {
        success: true,
        message: 'OK',
        isCreator: false,
        isCoAdmin: true,
        hasAcceptedTerms: true,
      };

      expect(component.isTelegramConnected).toBeFalsy();
    });

    it('should return false when both isCreator and isCoAdmin are false', () => {
      component.signInResponse = {
        success: true,
        message: 'OK',
        isCreator: false,
        isCoAdmin: false,
        hasAcceptedTerms: true,
      };

      expect(component.isTelegramConnected).toBeFalsy();
    });
  });

  describe('initial state', () => {
    it('should have isDaysDropdownOpen set to false initially', () => {
      expect(component.isDaysDropdownOpen).toBeFalse();
    });

    it('should have isChannelDropdownOpen set to false initially', () => {
      expect(component.isChannelDropdownOpen).toBeFalse();
    });

    it('should have signInResponse as null initially', () => {
      expect(component.signInResponse).toBeNull();
    });

    it('should have 6 daysOptions', () => {
      expect(component.daysOptions.length).toBe(6);
    });

    it('should have currentDate set', () => {
      expect(component.currentDate).toBeDefined();
      expect(component.currentDate instanceof Date).toBeTrue();
    });
  });
});
