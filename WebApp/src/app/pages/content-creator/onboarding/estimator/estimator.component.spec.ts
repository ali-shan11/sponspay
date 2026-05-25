import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { createMockFirebaseAuth } from '../../../../../testing/mocks/firebase-auth.mock';
import { TokenService } from '@services/token.service';
import { AuthService } from '@services/auth.service';
import { YouTubeOAuthService } from '@services/youtube-oauth.service';
import { OnboardingService } from '@services/onboarding.service';
import { AccountsService } from '@services/accounts.service';
import { MarketingService } from '@services/marketing.service';
import { ChannelInfo, YouTubeAnalyticsReportResponse } from '@app-types/youtube-analytics';

import { EstimatorComponent } from './estimator.component';

describe('EstimatorComponent', () => {
  let component: EstimatorComponent;
  let fixture: ComponentFixture<EstimatorComponent>;
  let mockAuthService: any;
  let mockYoutubeOAuthService: any;
  let mockOnboardingService: any;
  let mockAccountsService: any;
  let mockMarketingService: any;
  let channelStatusSubject: BehaviorSubject<string>;
  let availableChannelsSubject: BehaviorSubject<ChannelInfo[]>;

  const mockChannel: ChannelInfo = {
    id: 'UC123',
    title: 'Test Channel',
    thumbnail: 'https://example.com/thumb.jpg',
    role: 'owner',
    subscriberCount: 50000,
  };

  beforeEach(async () => {
    channelStatusSubject = new BehaviorSubject<string>('unknown');
    availableChannelsSubject = new BehaviorSubject<ChannelInfo[]>([]);

    mockAuthService = {
      ensureValidToken: jasmine.createSpy('ensureValidToken').and.returnValue(Promise.resolve('mock-token')),
      user$: new BehaviorSubject(null),
      creatorSignInResponse$: new BehaviorSubject(null),
      accessToken$: new BehaviorSubject(null),
      signOut: jasmine.createSpy('signOut'),
      onLoginClick: jasmine.createSpy('onLoginClick'),
    };

    mockYoutubeOAuthService = {
      channelStatus$: channelStatusSubject.asObservable(),
      availableChannels$: availableChannelsSubject.asObservable(),
      selectedChannel: null as ChannelInfo | null,
      getChannelMembersReportForChannel: jasmine.createSpy('getChannelMembersReportForChannel').and.returnValue(Promise.resolve(undefined)),
      fetchAndSetChannelData: jasmine.createSpy('fetchAndSetChannelData'),
    };

    mockOnboardingService = {
      youtubePayingUsersPercentage: 0,
      sponspayPayingUsersPercentage: 0,
      currentStep: 0,
      cancelOnboarding: jasmine.createSpy('cancelOnboarding'),
    };

    mockAccountsService = {
      getCountriesList: jasmine.createSpy('getCountriesList').and.returnValue(of([
        { countryCode: 'KEN', country: 'Kenya' },
        { countryCode: 'UGA', country: 'Uganda' },
      ])),
    };

    mockMarketingService = {
      getCountryMarketData: jasmine.createSpy('getCountryMarketData').and.returnValue(of([
        { iso3Code: 'KEN', iso2Code: 'KE', name: 'Kenya', creditCardPenetration: 4.4, mobilePenetration: 92.7 },
        { iso3Code: 'UGA', iso2Code: 'UG', name: 'Uganda', creditCardPenetration: 2.0, mobilePenetration: 78.6 },
        { iso3Code: 'NGA', iso2Code: 'NG', name: 'Nigeria', creditCardPenetration: 3.2, mobilePenetration: 83.8 },
        { iso3Code: 'TZA', iso2Code: 'TZ', name: 'Tanzania', creditCardPenetration: 0.9, mobilePenetration: 77.8 },
        { iso3Code: 'ZAF', iso2Code: 'ZA', name: 'South Africa', creditCardPenetration: 4.4, mobilePenetration: 79.0 },
      ])),
    };

    await TestBed.configureTestingModule({
      imports: [EstimatorComponent, HttpClientTestingModule],
      providers: [
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: TokenService, useValue: jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() }) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], { events: of(), url: '/' }) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}), queryParams: of({}) } },
        { provide: AuthService, useValue: mockAuthService },
        { provide: YouTubeOAuthService, useValue: mockYoutubeOAuthService },
        { provide: OnboardingService, useValue: mockOnboardingService },
        { provide: AccountsService, useValue: mockAccountsService },
        { provide: MarketingService, useValue: mockMarketingService },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstimatorComponent);
    component = fixture.componentInstance;
  });

  it('should create', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.showPotentialEarning).toBe(false);
    expect(component.hasYouTubeChannel).toBe(false);
    expect(component.accessToken).toBeNull();
    expect(component.totalSubscribers).toBe(0);
    expect(component.youtubePayablePercent).toBe(0);
    expect(component.sponspayPayablePercent).toBe(0);
    expect(component.revenueIncrease).toBe(0);
    expect(component.isCalculatingRevenue).toBe(false);
    expect(component.availableChannels).toEqual([]);
    expect(component.showChannelSelection).toBe(false);
    expect(component.analyticsError).toBeNull();
    expect(component.countryViewerData).toEqual([]);
  });

  describe('ngOnInit', () => {
    it('should set hasYouTubeChannel to true when channelStatus$ emits found', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      channelStatusSubject.next('found');
      expect(component.hasYouTubeChannel).toBe(true);
    });

    it('should set hasYouTubeChannel to false when channelStatus$ emits not_found', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      channelStatusSubject.next('not_found');
      expect(component.hasYouTubeChannel).toBe(false);
    });

    it('should not set onboardingService percentages until analytics are loaded', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      expect(mockOnboardingService.youtubePayingUsersPercentage).toBe(0);
      expect(mockOnboardingService.sponspayPayingUsersPercentage).toBe(0);
    });

    it('should show channel selection when multiple channels available', async () => {
      const channels: ChannelInfo[] = [
        mockChannel,
        { ...mockChannel, id: 'UC456', title: 'Second Channel' },
      ];
      fixture.detectChanges();
      await fixture.whenStable();
      availableChannelsSubject.next(channels);
      await fixture.whenStable();
      expect(component.showChannelSelection).toBe(true);
      expect(component.availableChannels.length).toBe(2);
    });

    it('should use fallback supported countries when API fails', async () => {
      mockAccountsService.getCountriesList.and.returnValue(throwError(() => new Error('API error')));
      mockMarketingService.getCountryMarketData.and.returnValue(throwError(() => new Error('API error')));
      fixture.detectChanges();
      await fixture.whenStable();
      // Component should still be functional with fallback countries
      expect(component).toBeTruthy();
    });

    it('should load analytics when exactly one channel is available', async () => {
      const analyticsResponse: YouTubeAnalyticsReportResponse = {
        kind: 'youtubeAnalytics#resultTable',
        columnHeaders: [],
        rows: [['KE', '1000'], ['US', '5000']]
      };
      mockYoutubeOAuthService.getChannelMembersReportForChannel.and.returnValue(Promise.resolve(analyticsResponse));

      fixture.detectChanges();
      await fixture.whenStable();

      availableChannelsSubject.next([mockChannel]);
      await fixture.whenStable();
      // Wait for async loadAnalyticsForSelectedChannel
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockYoutubeOAuthService.selectedChannel).toEqual(mockChannel);
      expect(mockYoutubeOAuthService.getChannelMembersReportForChannel).toHaveBeenCalledWith('UC123');
      expect(component.analyticsData).toEqual(analyticsResponse);
    });

    it('should handle empty channels array', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      availableChannelsSubject.next([]);
      await fixture.whenStable();
      expect(component.availableChannels).toEqual([]);
      expect(component.showChannelSelection).toBe(false);
    });
  });

  describe('ngOnDestroy', () => {
    it('should clean up subscriptions', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('showResults', () => {
    it('should toggle showPotentialEarning and emit showEarningClick', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      spyOn(component.showEarningClick, 'emit');

      component.showResults();
      expect(component.showPotentialEarning).toBe(true);
      expect(component.showEarningClick.emit).toHaveBeenCalledWith(true);

      component.showResults();
      expect(component.showPotentialEarning).toBe(false);
      expect(component.showEarningClick.emit).toHaveBeenCalledWith(false);
    });
  });

  describe('selectedChannel getter', () => {
    it('should return youtubeOAuthService.selectedChannel', () => {
      mockYoutubeOAuthService.selectedChannel = mockChannel;
      expect(component.selectedChannel).toEqual(mockChannel);
    });

    it('should return null when no channel selected', () => {
      mockYoutubeOAuthService.selectedChannel = null;
      expect(component.selectedChannel).toBeNull();
    });
  });

  describe('onShowEarningClick', () => {
    it('should toggle showPotentialEarning and parse country data', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      spyOn(component.showEarningClick, 'emit');

      component.onShowEarningClick();
      expect(component.showPotentialEarning).toBe(true);
      expect(component.showEarningClick.emit).toHaveBeenCalledWith(true);
    });

    it('should parse country data from analytics when toggled on', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      // Set up analytics data with supported country rows
      component.analyticsData = {
        kind: 'youtubeAnalytics#resultTable',
        columnHeaders: [],
        rows: [['KE', '1000'], ['UG', '500'], ['US', '3000'], ['ZA', '200']]
      };
      // Set supportedAlpha2Codes and marketDataMap (simulating API data)
      (component as any).supportedAlpha2Codes = new Set(['KE', 'UG', 'ZA', 'TZ', 'NG']);
      (component as any).marketDataMap = new Map([
        ['KE', { iso3Code: 'KEN', iso2Code: 'KE', name: 'Kenya', creditCardPenetration: 4.4, mobilePenetration: 92.7 }],
        ['UG', { iso3Code: 'UGA', iso2Code: 'UG', name: 'Uganda', creditCardPenetration: 2.0, mobilePenetration: 78.6 }],
        ['ZA', { iso3Code: 'ZAF', iso2Code: 'ZA', name: 'South Africa', creditCardPenetration: 4.4, mobilePenetration: 79.0 }],
      ]);

      component.onShowEarningClick();
      expect(component.countryViewerData.length).toBeGreaterThan(0);
      // KE, UG, ZA should be included; US should not
      const countryCodes = component.countryViewerData.map(d => d.countryCode);
      expect(countryCodes).toContain('KE');
      expect(countryCodes).toContain('UG');
      expect(countryCodes).toContain('ZA');
      expect(countryCodes).not.toContain('US');

      // Verify market data is correctly mapped
      const keData = component.countryViewerData.find(d => d.countryCode === 'KE')!;
      expect(keData.countryName).toBe('Kenya');
      expect(keData.creditCardMarketShare).toBe(4.4);
      expect(keData.mobileSimCardMarketShare).toBe(92.7);
    });

    it('should return empty country data when no analytics data', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.analyticsData = undefined;
      component.onShowEarningClick();
      expect(component.countryViewerData).toEqual([]);
    });

    it('should return empty country data when analytics has no rows', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.analyticsData = {
        kind: 'youtubeAnalytics#resultTable',
        columnHeaders: [],
        rows: []
      };
      component.onShowEarningClick();
      expect(component.countryViewerData).toEqual([]);
    });

    it('should handle rows with insufficient length', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.analyticsData = {
        kind: 'youtubeAnalytics#resultTable',
        columnHeaders: [],
        rows: [['KE']] // Only 1 element instead of 2
      };
      (component as any).supportedAlpha2Codes = new Set(['KE']);
      component.onShowEarningClick();
      // Row with < 2 elements should be skipped
      expect(component.countryViewerData).toEqual([]);
    });
  });

  describe('selectChannel', () => {
    it('should set selectedChannel, hide channel selection, and load analytics', async () => {
      const analyticsResponse: YouTubeAnalyticsReportResponse = {
        kind: 'youtubeAnalytics#resultTable',
        columnHeaders: [],
        rows: [['KE', '1000'], ['UG', '500']]
      };
      mockYoutubeOAuthService.getChannelMembersReportForChannel.and.returnValue(Promise.resolve(analyticsResponse));

      fixture.detectChanges();
      await fixture.whenStable();

      await component.selectChannel(mockChannel);
      expect(mockYoutubeOAuthService.selectedChannel).toEqual(mockChannel);
      expect(component.showChannelSelection).toBe(false);
      expect(component.analyticsData).toEqual(analyticsResponse);
    });

    it('should handle analytics error gracefully', async () => {
      mockYoutubeOAuthService.getChannelMembersReportForChannel.and.returnValue(Promise.reject(new Error('Analytics failed')));

      fixture.detectChanges();
      await fixture.whenStable();

      await component.selectChannel(mockChannel);
      expect(component.analyticsError).toBe('Failed to load analytics data for this channel.');
      expect(component.isCalculatingRevenue).toBe(false);
    });

    it('should skip loading when no access token', async () => {
      mockAuthService.ensureValidToken.and.returnValue(Promise.resolve(null));

      fixture.detectChanges();
      await fixture.whenStable();

      await component.selectChannel(mockChannel);
      expect(mockYoutubeOAuthService.getChannelMembersReportForChannel).not.toHaveBeenCalled();
    });

    it('should skip loading when already calculating revenue', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.isCalculatingRevenue = true;
      await component.selectChannel(mockChannel);
      expect(mockYoutubeOAuthService.getChannelMembersReportForChannel).not.toHaveBeenCalled();
    });

    it('should skip loading when data already loaded for same channel', async () => {
      const analyticsResponse: YouTubeAnalyticsReportResponse = {
        kind: 'youtubeAnalytics#resultTable',
        columnHeaders: [],
        rows: [['KE', '1000']]
      };
      mockYoutubeOAuthService.getChannelMembersReportForChannel.and.returnValue(Promise.resolve(analyticsResponse));

      fixture.detectChanges();
      await fixture.whenStable();

      // First load
      await component.selectChannel(mockChannel);
      expect(mockYoutubeOAuthService.getChannelMembersReportForChannel).toHaveBeenCalledTimes(1);

      // Second load for same channel - should be skipped
      await component.selectChannel(mockChannel);
      expect(mockYoutubeOAuthService.getChannelMembersReportForChannel).toHaveBeenCalledTimes(1);
    });
  });

  describe('backToChannelSelection', () => {
    it('should reset channel selection state', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.backToChannelSelection();
      expect(component.showChannelSelection).toBe(true);
      expect(mockYoutubeOAuthService.selectedChannel).toBeNull();
      expect(component.analyticsData).toBeUndefined();
      expect(component.analyticsError).toBeNull();
    });
  });

  describe('loadAnalyticsForSelectedChannel (via selectChannel)', () => {
    it('should calculate revenue impact with subscriber count and analytics data', async () => {
      const analyticsResponse: YouTubeAnalyticsReportResponse = {
        kind: 'youtubeAnalytics#resultTable',
        columnHeaders: [],
        rows: [['KE', '1000'], ['UG', '500'], ['US', '3000']]
      };
      mockYoutubeOAuthService.getChannelMembersReportForChannel.and.returnValue(Promise.resolve(analyticsResponse));

      fixture.detectChanges();
      await fixture.whenStable();

      await component.selectChannel(mockChannel);
      expect(component.totalSubscribers).toBe(50000);
      expect(component.revenueIncrease).toBeGreaterThan(0);

      // youtubePayablePercent and sponspayPayablePercent should be computed from market data, not hardcoded
      expect(component.youtubePayablePercent).toBeGreaterThan(0);
      expect(component.sponspayPayablePercent).toBeGreaterThan(component.youtubePayablePercent);
      // Verify onboardingService was updated with computed values
      expect(mockOnboardingService.youtubePayingUsersPercentage).toBe(component.youtubePayablePercent);
      expect(mockOnboardingService.sponspayPayingUsersPercentage).toBe(component.sponspayPayablePercent);
    });

    it('should handle channel with no subscriberCount', async () => {
      const channelNoSubs: ChannelInfo = { ...mockChannel, subscriberCount: 0 };
      const analyticsResponse: YouTubeAnalyticsReportResponse = {
        kind: 'youtubeAnalytics#resultTable',
        columnHeaders: [],
        rows: [['KE', '100']]
      };
      mockYoutubeOAuthService.getChannelMembersReportForChannel.and.returnValue(Promise.resolve(analyticsResponse));

      fixture.detectChanges();
      await fixture.whenStable();

      await component.selectChannel(channelNoSubs);
      expect(component.totalSubscribers).toBe(0);
    });

    it('should handle analytics with null rows', async () => {
      const analyticsResponse: YouTubeAnalyticsReportResponse = {
        kind: 'youtubeAnalytics#resultTable',
        columnHeaders: [],
        rows: null as any
      };
      mockYoutubeOAuthService.getChannelMembersReportForChannel.and.returnValue(Promise.resolve(analyticsResponse));

      fixture.detectChanges();
      await fixture.whenStable();

      await component.selectChannel(mockChannel);
      expect(component.supportedCountries).toBe(0);
      expect(component.totalViewersInSupportedCountries).toBe(0);
    });

    it('should count supported countries in analytics data', async () => {
      const analyticsResponse: YouTubeAnalyticsReportResponse = {
        kind: 'youtubeAnalytics#resultTable',
        columnHeaders: [],
        rows: [['KE', '1000'], ['UG', '500'], ['US', '3000'], ['ZA', '200']]
      };
      mockYoutubeOAuthService.getChannelMembersReportForChannel.and.returnValue(Promise.resolve(analyticsResponse));

      fixture.detectChanges();
      await fixture.whenStable();

      await component.selectChannel(mockChannel);
      // KE and UG should be supported (from mock getCountriesList with KEN and UGA)
      expect(component.totalViewersInSupportedCountries).toBeGreaterThan(0);
    });

    it('should handle undefined analytics response', async () => {
      mockYoutubeOAuthService.getChannelMembersReportForChannel.and.returnValue(Promise.resolve(undefined));

      fixture.detectChanges();
      await fixture.whenStable();

      await component.selectChannel(mockChannel);
      expect(component.supportedCountries).toBe(0);
    });
  });

  describe('shouldShowChannelSelection', () => {
    it('should return true when YouTube connected, showing selection, and multiple channels', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.hasYouTubeChannel = true;
      component.showChannelSelection = true;
      component.availableChannels = [mockChannel, { ...mockChannel, id: 'UC456' }];
      expect(component.shouldShowChannelSelection).toBe(true);
    });

    it('should return false when hasYouTubeChannel is false', () => {
      component.hasYouTubeChannel = false;
      component.showChannelSelection = true;
      component.availableChannels = [mockChannel, { ...mockChannel, id: 'UC456' }];
      expect(component.shouldShowChannelSelection).toBe(false);
    });

    it('should return false when showChannelSelection is false', () => {
      component.hasYouTubeChannel = true;
      component.showChannelSelection = false;
      component.availableChannels = [mockChannel, { ...mockChannel, id: 'UC456' }];
      expect(component.shouldShowChannelSelection).toBe(false);
    });

    it('should return false when only one channel available', () => {
      component.hasYouTubeChannel = true;
      component.showChannelSelection = true;
      component.availableChannels = [mockChannel];
      expect(component.shouldShowChannelSelection).toBe(false);
    });
  });

  describe('shouldShowAnalytics', () => {
    it('should return true when connected, not showing selection, and channel selected', () => {
      component.hasYouTubeChannel = true;
      component.showChannelSelection = false;
      mockYoutubeOAuthService.selectedChannel = mockChannel;
      expect(component.shouldShowAnalytics).toBe(true);
    });

    it('should return false when no channel selected', () => {
      component.hasYouTubeChannel = true;
      component.showChannelSelection = false;
      mockYoutubeOAuthService.selectedChannel = null;
      expect(component.shouldShowAnalytics).toBe(false);
    });
  });

  describe('getMessageVariation', () => {
    it('should return loading when no loadedChannelId', () => {
      expect(component.getMessageVariation).toBe('loading');
    });

    it('should return loading when isCalculatingRevenue', () => {
      (component as any).loadedChannelId = 'UC123';
      component.isCalculatingRevenue = true;
      expect(component.getMessageVariation).toBe('loading');
    });

    it('should return not-qualified when subscribers below minimum', () => {
      (component as any).loadedChannelId = 'UC123';
      component.isCalculatingRevenue = false;
      component.totalSubscribers = 0;
      expect(component.getMessageVariation).toBe('not-qualified');
    });

    it('should return qualified-with-viewers when subscribers above minimum and has viewers', () => {
      (component as any).loadedChannelId = 'UC123';
      component.isCalculatingRevenue = false;
      component.totalSubscribers = 100000;
      component.totalViewersInSupportedCountries = 500;
      expect(component.getMessageVariation).toBe('qualified-with-viewers');
    });

    it('should return qualified-no-viewers when subscribers above minimum but no viewers', () => {
      (component as any).loadedChannelId = 'UC123';
      component.isCalculatingRevenue = false;
      component.totalSubscribers = 100000;
      component.totalViewersInSupportedCountries = 0;
      expect(component.getMessageVariation).toBe('qualified-no-viewers');
    });
  });
});
