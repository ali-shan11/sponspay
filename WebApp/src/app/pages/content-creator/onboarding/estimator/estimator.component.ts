import { SvgIcons } from '@utils/svg-icons';
import { Component, EventEmitter, inject, OnDestroy, OnInit, Output } from '@angular/core';
import { combineLatest, EMPTY, firstValueFrom, from, Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { PotentialEarningComponent } from "../potential-earning/potential-earning.component";
import { AuthService } from '@services/auth.service';
import { YouTubeOAuthService } from '@services/youtube-oauth.service';
import { OnboardingService } from '@services/onboarding.service';
import { AccountsService } from '@services/accounts.service';
import { MarketingService } from '@services/marketing.service';
import { ChannelInfo, YouTubeAnalyticsReportResponse } from '@app-types/youtube-analytics';
import { CountryMarketData, CountryViewerData } from '@app-types/onboarding';
import { DecimalPipe } from '@angular/common';
import { InlineSvgComponent } from '@components/inline-svg/inline-svg.component';
import { minimumNumberOfSubscribers } from '@utils/constants';
import { getAlpha2Code } from '@utils/countrycodes';

@Component({
  selector: 'app-estimator',
  imports: [DecimalPipe, InlineSvgComponent, PotentialEarningComponent],
  templateUrl: './estimator.component.html',
  styleUrl: './estimator.component.scss'
})
export class EstimatorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  @Output() showEarningClick = new EventEmitter<boolean>();
  public showPotentialEarning = false;
  public hasYouTubeChannel = false;
  public accessToken: string | null = null;

  public svgIcon = SvgIcons;
  private authService: AuthService = inject(AuthService);
  private youtubeOAuthService: YouTubeOAuthService = inject(YouTubeOAuthService);
  private onboardingService: OnboardingService = inject(OnboardingService);
  private accountsService: AccountsService = inject(AccountsService);
  private marketingService: MarketingService = inject(MarketingService);

  totalSubscribers = 0;
  totalViewersInSupportedCountries = 0;
  viewersWhoCanPayViaYouTube = 0;
  viewersWhoCanPayViaSponsPay = 0;
  youtubePayablePercent = 0;
  sponspayPayablePercent = 0;
  revenueIncrease = 0;
  isCalculatingRevenue = false;

  availableChannels: ChannelInfo[] = [];
  showChannelSelection = false;
  analyticsData?: YouTubeAnalyticsReportResponse;
  analyticsError: string | null = null;
  countryViewerData: CountryViewerData[] = [];
  supportedCountries = 0;
  minimumNumberOfSubscribers = minimumNumberOfSubscribers;
  noChannelsFound = false;

  // Supported country alpha-2 codes fetched from the backend
  private static readonly FALLBACK_SUPPORTED_CODES = new Set(['KE', 'UG', 'ZA', 'TZ', 'NG', 'SS']);
  private supportedAlpha2Codes = new Set<string>();
  private marketDataMap = new Map<string, CountryMarketData>();

  ngOnInit(): void {
    this.youtubeOAuthService.channelStatus$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((status) => {
      this.hasYouTubeChannel = status === 'found';
    });

    // Combine channel data with async prerequisites (token + countries).
    // combineLatest won't emit until BOTH sources have produced a value,
    // so analytics never loads before prerequisites are ready.
    combineLatest([
      this.youtubeOAuthService.availableChannels$,
      from(this.initPrerequisites())
    ]).pipe(
      takeUntil(this.destroy$),
      switchMap(([channels]) => {
        this.availableChannels = channels;

        if (channels.length > 1) {
          this.noChannelsFound = false;
          this.showChannelSelection = true;
          this.youtubeOAuthService.selectedChannel = channels[0];
          return EMPTY;
        }
        if (channels.length === 1) {
          this.noChannelsFound = false;
          this.youtubeOAuthService.selectedChannel = channels[0];
          return from(this.loadAnalyticsForSelectedChannel());
        }
        this.noChannelsFound = true;
        return EMPTY;
      })
    ).subscribe();

    // Percentages are set after calculateRevenueImpact() computes them from market data
  }

  private async initPrerequisites(): Promise<void> {
    this.accessToken = await this.authService.ensureValidToken();

    try {
      const [countries, marketData] = await Promise.all([
        firstValueFrom(this.accountsService.getCountriesList()),
        firstValueFrom(this.marketingService.getCountryMarketData()),
      ]);

      this.supportedAlpha2Codes = new Set(
        countries.map(c => getAlpha2Code(c.countryCode)).filter(Boolean)
      );

      this.marketDataMap.clear();
      for (const data of marketData) {
        this.marketDataMap.set(data.iso2Code, data);
      }
    } catch (err) {
      console.error('Failed to fetch prerequisites, using fallback list:', err);
      this.supportedAlpha2Codes = EstimatorComponent.FALLBACK_SUPPORTED_CODES;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  showResults(){
    this.showPotentialEarning = !this.showPotentialEarning;
    this.showEarningClick.emit(this.showPotentialEarning);
  }

  get selectedChannel(){
    return this.youtubeOAuthService.selectedChannel;
  }

  onShowEarningClick(){
    this.showPotentialEarning = !this.showPotentialEarning;
    this.countryViewerData = this.parseCountryDataFromAnalytics();
    this.showEarningClick.emit(this.showPotentialEarning);
  }

  async selectChannel(channel: ChannelInfo) {
    this.youtubeOAuthService.selectedChannel = channel;
    this.showChannelSelection = false;
    await this.loadAnalyticsForSelectedChannel();
  }

  backToChannelSelection() {
    this.showChannelSelection = true;
    this.youtubeOAuthService.selectedChannel = null;
    this.analyticsData = undefined;
    this.analyticsError = null;
    this.loadedChannelId = null;
  }

  private loadedChannelId: string | null = null;

  private async loadAnalyticsForSelectedChannel() {
    if (!this.youtubeOAuthService.selectedChannel || !this.accessToken) {
      return;
    }

    // Skip if already loading or if data is already loaded for this channel
    if (this.isCalculatingRevenue) {
      return;
    }
    if (this.loadedChannelId === this.youtubeOAuthService.selectedChannel.id && this.analyticsData) {
      return;
    }

    this.isCalculatingRevenue = true;
    this.analyticsError = null;

    try {
      this.analyticsData = await this.youtubeOAuthService.getChannelMembersReportForChannel(
        this.youtubeOAuthService.selectedChannel.id
      );
      this.loadedChannelId = this.youtubeOAuthService.selectedChannel.id;

      // Calculate revenue impact based on analytics data
      this.calculateRevenueImpact();

    } catch (error) {
      console.error('Error loading analytics:', error);
      this.analyticsError = 'Failed to load analytics data for this channel.';
    } finally {
      this.isCalculatingRevenue = false;
    }
  }

  private calculateRevenueImpact() {
    // Get total subscriber count from selected channel
    if (this.youtubeOAuthService.selectedChannel && this.youtubeOAuthService.selectedChannel.subscriberCount) {
      this.totalSubscribers = this.youtubeOAuthService.selectedChannel.subscriberCount || 0;
    }

    this.parseAnalyticsData();

    // Calculate revenue increase multiplier
    this.revenueIncrease = this.youtubePayablePercent > 0
      ? Math.round((this.sponspayPayablePercent / this.youtubePayablePercent) * 10) / 10
      : 0;

    this.onboardingService.youtubePayingUsersPercentage = this.youtubePayablePercent;
    this.onboardingService.sponspayPayingUsersPercentage = this.sponspayPayablePercent;
  }

  private parseAnalyticsData() {
    if (!this.analyticsData || !this.analyticsData.rows) {
      this.supportedCountries = 0;
      this.totalViewersInSupportedCountries = 0;
      this.viewersWhoCanPayViaYouTube = 0;
      this.viewersWhoCanPayViaSponsPay = 0;
      this.youtubePayablePercent = 0;
      this.sponspayPayablePercent = 0;
      return;
    }

    this.supportedCountries = 0;
    this.totalViewersInSupportedCountries = 0;
    this.viewersWhoCanPayViaYouTube = 0;
    this.viewersWhoCanPayViaSponsPay = 0;

    for (const row of this.analyticsData.rows) {
      if (row && row.length >= 2) {
        const countryCode = row[0] as string;
        const viewers = parseInt(row[1] as string) || 0;

        if (this.supportedAlpha2Codes.has(countryCode)) {
          const marketData = this.marketDataMap.get(countryCode);
          if (marketData) {
            this.supportedCountries += 1;
            this.totalViewersInSupportedCountries += viewers;
            const youtubeAccess = viewers * (marketData.creditCardPenetration / 100);
            const mobileAccess = viewers * (marketData.mobilePenetration / 100);
            this.viewersWhoCanPayViaYouTube += youtubeAccess;
            this.viewersWhoCanPayViaSponsPay += youtubeAccess + mobileAccess;
          }
        }
      }
    }

    if (this.totalViewersInSupportedCountries > 0) {
      this.youtubePayablePercent = Math.round((this.viewersWhoCanPayViaYouTube / this.totalViewersInSupportedCountries) * 1000) / 10;
      this.sponspayPayablePercent = Math.round((this.viewersWhoCanPayViaSponsPay / this.totalViewersInSupportedCountries) * 1000) / 10;
    } else {
      this.youtubePayablePercent = 0;
      this.sponspayPayablePercent = 0;
    }
  }

  get shouldShowChannelSelection(): boolean {
    return this.hasYouTubeChannel && this.showChannelSelection && this.availableChannels.length > 1;
  }

  get shouldShowAnalytics(): boolean {
    return this.hasYouTubeChannel && !this.showChannelSelection && this.youtubeOAuthService.selectedChannel !== null;
  }

  get getMessageVariation(): 'loading' | 'no-channels' | 'qualified-with-viewers' | 'qualified-no-viewers' | 'not-qualified' {
    if (this.noChannelsFound) {
      return 'no-channels';
    }
    if (!this.loadedChannelId || this.isCalculatingRevenue) {
      return 'loading';
    }

    if (this.totalSubscribers < minimumNumberOfSubscribers) {
      return 'not-qualified';
    }

    if (this.totalViewersInSupportedCountries > 0) {
      return 'qualified-with-viewers';
    }

    return 'qualified-no-viewers';
  }

  private parseCountryDataFromAnalytics(): CountryViewerData[] {
    if (!this.analyticsData || !this.analyticsData.rows) {
      return [];
    }

    const countryData: CountryViewerData[] = [];

    for (const row of this.analyticsData.rows) {
      if (row && row.length >= 2) {
        const countryCode = row[0] as string;
        const viewers = parseInt(row[1] as string) || 0;
        const marketData = this.marketDataMap.get(countryCode);

        if (this.supportedAlpha2Codes.has(countryCode) && marketData) {
          const flagUrl = 'svg-country-flags/svg/' + countryCode.toLowerCase() + '.svg';
          countryData.push({
            countryCode,
            countryName: marketData.name,
            flagEmoji: flagUrl,
            flag: flagUrl,
            viewersInSponspayCountry: viewers,
            creditCardMarketShare: marketData.creditCardPenetration,
            mobileSimCardMarketShare: marketData.mobilePenetration
          });
        }
      }
    }

    return countryData;
  }
}
