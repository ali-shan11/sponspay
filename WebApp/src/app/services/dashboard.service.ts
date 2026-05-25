import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { ChannelStatisticsResponse, CreatorYoutubeChannel, PaymentOverviewResponse, RevenuePerDayResponse, TopEarningCountriesResponse, TransactionsResponse } from '@app-types/dashboard';
import { APP_ENDPOINTS } from '@utils/urls';
import { CUSTOM_REQUEST_CONTEXT } from '../auth/interceptor/http-context.tokens';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private BASE_URL = environment.API_BASE;
  private http = inject(HttpClient);
  public selectedDaysObservable = new BehaviorSubject(30);
  public selectedChannelObservable = new BehaviorSubject<string>('');
  public refresh$ = new Subject<void>();
  public channelList$ = new BehaviorSubject<CreatorYoutubeChannel[]>([]);
  private channelsLoaded = false;

  triggerRefresh() {
    this.refresh$.next();
  }

  reset() {
    this.channelsLoaded = false;
    this.channelList$.next([]);
    this.selectedChannelObservable.next('');
    this.selectedDaysObservable.next(30);
  }

  loadChannels(): void {
    if (this.channelsLoaded) return;
    this.channelsLoaded = true;
    this.getCreatorChannels().subscribe({
      next: (channels) => {
        this.channelList$.next(channels);
        if (channels.length > 0 && !this.selectedChannelObservable.value) {
          this.selectedChannelObservable.next(channels[0].id);
        }
      },
      error: () => {
        // Unlock so the next call retries (e.g. after auth token is ready)
        this.channelsLoaded = false;
      },
    });
  }

  private loaderContext = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, {
    showLoader:true
  });

  // JS getTimezoneOffset() returns the inverse of the UTC offset (e.g. UTC+2 → -120).
  // The API expects local = UTC + offset, so we negate it.
  private get tzOffsetMinutes(): number {
    return -new Date().getTimezoneOffset();
  }

  getRevenuePerDay(): Observable<RevenuePerDayResponse> {
    const params = {days: this.selectedDaysObservable.value , tzOffsetMinutes: this.tzOffsetMinutes, channelId: this.selectedChannelObservable.value};
    return this.http.get<RevenuePerDayResponse>(this.BASE_URL+'/creator-insights/revenue-per-day', {params});
  }

  getTopEarningCountries(limit = 5): Observable<TopEarningCountriesResponse> {
    const params = {days: this.selectedDaysObservable.value, limit, tzOffsetMinutes: this.tzOffsetMinutes, channelId: this.selectedChannelObservable.value};
    return this.http.get<TopEarningCountriesResponse>(this.BASE_URL+'/creator-insights/top-earning-countries', {params});
  }
  
  getChannelStatistics(): Observable<ChannelStatisticsResponse> {
    const params = {days: this.selectedDaysObservable.value, channelId: this.selectedChannelObservable.value};
    return this.http.get<ChannelStatisticsResponse>(this.BASE_URL+'/creator-insights/channel-statistics', {params});
  }

  getTransactionsList(page:number, limit:number): Observable<TransactionsResponse> {
    const params = {days: this.selectedDaysObservable.value, page, limit, channelId: this.selectedChannelObservable.value};
    return this.http.get<TransactionsResponse>(this.BASE_URL+'/creator-insights/transactions', {params});
  }

  getPaymentOverview(): Observable<PaymentOverviewResponse> {
    const params = {days: this.selectedDaysObservable.value, channelId: this.selectedChannelObservable.value};
    return this.http.get<PaymentOverviewResponse>(this.BASE_URL+'/creator-insights/payment-overview', {params});
  }

  getCreatorChannels(): Observable<CreatorYoutubeChannel[]> {
    return this.http.get<CreatorYoutubeChannel[]>(this.BASE_URL+APP_ENDPOINTS.CREATOR_YOUTUBE_CHANNELS, {context: this.loaderContext});
  }
}
