import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { createMockFirebaseAuth } from '../../../../testing/mocks/firebase-auth.mock';
import { TokenService } from '@services/token.service';
import { AuthService } from '@services/auth.service';
import { DashboardService } from '@services/dashboard.service';
import { ChannelStatisticsResponse } from '@app-types/dashboard';

import { DashboardSidebarComponent } from './dashboard-sidebar.component';

describe('DashboardSidebarComponent', () => {
  let component: DashboardSidebarComponent;
  let fixture: ComponentFixture<DashboardSidebarComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockDashboardService: any;
  let selectedChannelSubject: BehaviorSubject<string | null>;

  const mockChannelStats: ChannelStatisticsResponse = {
    channelHandle: 'testhandle',
    linkClicks: 100,
    transactions: 50,
    transactionTrend: 10,
  };

  beforeEach(async () => {
    selectedChannelSubject = new BehaviorSubject<string | null>(null);
    mockRouter = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], { events: of(), url: '/' });
    mockAuthService = jasmine.createSpyObj('AuthService', ['signOut', 'onLoginClick'], {
      user$: new BehaviorSubject(null),
      creatorSignInResponse$: new BehaviorSubject(null),
      accessToken$: new BehaviorSubject(null),
    });

    mockDashboardService = {
      selectedChannelObservable: selectedChannelSubject,
      getChannelStatistics: jasmine.createSpy('getChannelStatistics').and.returnValue(of(mockChannelStats)),
      selectedDaysObservable: new BehaviorSubject(30),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardSidebarComponent, HttpClientTestingModule],
      providers: [
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: TokenService, useValue: jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() }) },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}), queryParams: of({}) } },
        { provide: AuthService, useValue: mockAuthService },
        { provide: DashboardService, useValue: mockDashboardService },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.channelStats).toBeNull();
    expect(component.isLoading).toBe(true);
    expect(component.isTextCopied).toBe(false);
  });

  describe('ngOnInit', () => {
    it('should subscribe to selectedChannelObservable', () => {
      expect(component.unSubscribe.length).toBeGreaterThan(0);
    });

    it('should call getChannelStats when channel ID is emitted', () => {
      selectedChannelSubject.next('channel-123');
      expect(mockDashboardService.getChannelStatistics).toHaveBeenCalled();
    });

    it('should not call getChannelStats when channel ID is null', () => {
      mockDashboardService.getChannelStatistics.calls.reset();
      selectedChannelSubject.next(null);
      expect(mockDashboardService.getChannelStatistics).not.toHaveBeenCalled();
    });
  });

  describe('getChannelStats', () => {
    it('should set channelStats and isLoading to false on success', () => {
      component.getChannelStats();
      expect(component.channelStats).toEqual(mockChannelStats);
      expect(component.isLoading).toBe(false);
    });

    it('should set isLoading to false on error', () => {
      mockDashboardService.getChannelStatistics.and.returnValue(throwError(() => new Error('Failed')));
      component.getChannelStats();
      expect(component.isLoading).toBe(false);
    });

    it('should set isLoading to true at start', () => {
      component.isLoading = false;
      mockDashboardService.getChannelStatistics.and.returnValue(of(mockChannelStats));
      component.getChannelStats();
      // After subscription resolves, isLoading becomes false
      expect(component.channelStats).toEqual(mockChannelStats);
    });
  });

  describe('url getter', () => {
    it('should return the correct URL with channelHandle', () => {
      component.channelStats = mockChannelStats;
      expect(component.url).toContain('/fan/testhandle');
    });

    it('should handle null channelStats', () => {
      component.channelStats = null;
      expect(component.url).toContain('/fan/');
    });
  });

  describe('copyToClipboard', () => {
    it('should copy url to clipboard and set isTextCopied', fakeAsync(() => {
      if (!(navigator.clipboard.writeText as any).and) {
        spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
      } else {
        (navigator.clipboard.writeText as jasmine.Spy).and.returnValue(Promise.resolve());
      }
      component.channelStats = mockChannelStats;
      component.copyToClipboard();
      tick();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(component.url);
      expect(component.isTextCopied).toBe(true);
      tick(2000);
      expect(component.isTextCopied).toBe(false);
    }));
  });

  describe('handleSignout', () => {
    it('should call authService.signOut', () => {
      component.handleSignout();
      expect(mockAuthService.signOut).toHaveBeenCalled();
    });
  });

  describe('gotoHomePage', () => {
    it('should navigate to home page', () => {
      component.gotoHomePage();
      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/');
    });
  });

  describe('ngOnDestroy', () => {
    it('should unsubscribe all subscriptions', () => {
      const spy = component.unSubscribe.map(sub => spyOn(sub, 'unsubscribe'));
      component.ngOnDestroy();
      spy.forEach(s => expect(s).toHaveBeenCalled());
    });
  });
});
