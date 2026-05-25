import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { createMockFirebaseAuth } from '../../../../testing/mocks/firebase-auth.mock';
import { TokenService } from '@services/token.service';
import { AuthService } from '@services/auth.service';

import { DashboardHeaderComponent } from './dashboard-header.component';
import { ChannelStatisticsResponse } from '@app-types/dashboard';

describe('DashboardHeaderComponent', () => {
  let component: DashboardHeaderComponent;
  let fixture: ComponentFixture<DashboardHeaderComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockTokenService: jasmine.SpyObj<TokenService>;
  let routerEvents$: Subject<any>;

  beforeEach(async () => {
    routerEvents$ = new Subject();
    mockRouter = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], {
      events: routerEvents$.asObservable(),
      url: '/',
    });
    mockAuthService = jasmine.createSpyObj('AuthService', ['signOut', 'onLoginClick'], {
      user$: new BehaviorSubject(null),
      creatorSignInResponse$: new BehaviorSubject(null),
      accessToken$: new BehaviorSubject(null),
    });
    mockTokenService = jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() });
    mockTokenService.getCurrentUserObj.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [DashboardHeaderComponent, HttpClientTestingModule],
      providers: [
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: TokenService, useValue: mockTokenService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: {
          firstChild: { firstChild: null, snapshot: { data: { title: 'Dashboard' } } },
          snapshot: { paramMap: new Map(), data: {} },
          params: of({}),
          queryParams: of({}),
        } },
        { provide: AuthService, useValue: mockAuthService },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.isDropdownOpen).toBe(false);
    expect(component.mobileMenuOpen).toBe(false);
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
    it('should toggle isDropdownOpen and stop propagation', () => {
      const mockEvent = jasmine.createSpyObj('MouseEvent', ['stopPropagation']);
      expect(component.isDropdownOpen).toBe(false);
      component.toggleDropdown(mockEvent);
      expect(component.isDropdownOpen).toBe(true);
      expect(mockEvent.stopPropagation).toHaveBeenCalled();

      component.toggleDropdown(mockEvent);
      expect(component.isDropdownOpen).toBe(false);
    });
  });

  describe('handleSignout', () => {
    it('should call authService.signOut', () => {
      component.handleSignout();
      expect(mockAuthService.signOut).toHaveBeenCalled();
    });
  });

  describe('subRouterEvents', () => {
    it('should update pageTitle on NavigationEnd', () => {
      // Emit a NavigationEnd event
      routerEvents$.next(new NavigationEnd(1, '/dashboard', '/dashboard'));
      // pageTitle should be updated via getPageTitle
      expect(component.pageTitle).toBeDefined();
    });
  });

 describe('copyToClipboard', () => {
      it('should copy url to clipboard and toggle isTextCopied flag', fakeAsync(() => {
        if (!(navigator.clipboard.writeText as any).and) {
          spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
        } else {
          (navigator.clipboard.writeText as jasmine.Spy).and.returnValue(Promise.resolve());
        }
        component.channelStats = { channelHandle: 'testchannel' } as ChannelStatisticsResponse;

        component.copyToClipboard();
        tick();
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(component.url);
        expect(component.isTextCopied).toBe(true);

        tick(2000);
        expect(component.isTextCopied).toBe(false);
      }));
  });

 describe('subYtChannelChange', () => {
    it('should subscribe to selectedChannelObservable and call getChannelStats when channelId exists', () => {
      spyOn(component, 'getChannelStats');

      // Simulate channel selection
      component.dashboardService.selectedChannelObservable.next('channel-123');

      expect(component.getChannelStats).toHaveBeenCalled();
    });
  });

  describe('getChannelStats', () => {
    it('should set isLoading true, fetch stats, and update channelStats on success', () => {
      const mockStats = { channelHandle: 'testchannel', subscriberCount: 1000, linkClicks: 2, transactions: 5, transactionTrend: 2 } as ChannelStatisticsResponse;
      spyOn(component.dashboardService, 'getChannelStatistics').and.returnValue(of(mockStats));

      component.getChannelStats();

      expect(component.isLoading).toBe(false);
      expect(component.dashboardService.getChannelStatistics).toHaveBeenCalled();

      // Simulate async completion
      fixture.detectChanges(); // or tick() if using fakeAsync

      expect(component.channelStats).toEqual(mockStats);
      expect(component.isLoading).toBe(false);
    });
  });

  describe('getPageTitle', () => {
    it('should return title from the deepest child route snapshot', () => {
      const mockRoute = {
        firstChild: {
          firstChild: {
            snapshot: { data: { title: 'Analytics' } }
          }
        }
      } as unknown as ActivatedRoute;

      const title = component['getPageTitle'](mockRoute); // private method access via bracket notation
      expect(title).toBe('Analytics');
    });

  });

});
