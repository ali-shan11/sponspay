import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LandingPageDetailResponse, MarketingNewsResponse } from '@app-types/marketing';
import { CountryMarketData } from '@app-types/onboarding';
import { APP_ENDPOINTS } from '@utils/urls';

@Injectable({
  providedIn: 'root'
})
export class MarketingService {
  public BASE_URL = environment.API_BASE;
  private http = inject(HttpClient);

  getLandingPageDetails(): Observable<LandingPageDetailResponse>{
    return this.http.get<LandingPageDetailResponse>(this.BASE_URL+ APP_ENDPOINTS.LANDING_PAGE_DETAILS);
  }
  
  getLatestNews(): Observable<MarketingNewsResponse[]>{
    const count = 1;
    return this.http.get<MarketingNewsResponse[]>(this.BASE_URL + APP_ENDPOINTS.NEWS_LATEST + `${count}`);
  }

  getCountryMarketData(): Observable<CountryMarketData[]> {
    return this.http.get<CountryMarketData[]>(this.BASE_URL + APP_ENDPOINTS.COUNTRY_MARKET_DATA);
  }
}
