import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MarketingService } from './marketing.service';
import { environment } from '../../environments/environment';
import { LandingPageDetailResponse, MarketingNewsResponse } from '@app-types/marketing';
import { CountryMarketData } from '@app-types/onboarding';
import { APP_ENDPOINTS } from '@utils/urls';

describe('MarketingService', () => {
  let service: MarketingService;
  let httpMock: HttpTestingController;
  const BASE_URL = environment.API_BASE;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(MarketingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have a BASE_URL property', () => {
    expect(service.BASE_URL).toBe(BASE_URL);
  });

  describe('getLandingPageDetails()', () => {
    it('should make a GET request to the landing page details endpoint', () => {
      const mockResponse: LandingPageDetailResponse = {
        totalRevenue: 50000,
        growth: 25,
        countriesSupported: 12,
        transactions: 1500,
        users: [{ avatar: 'https://example.com/avatar1.jpg' }]
      };

      service.getLandingPageDetails().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(BASE_URL + APP_ENDPOINTS.LANDING_PAGE_DETAILS);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should return landing page data with multiple users', () => {
      const mockResponse: LandingPageDetailResponse = {
        totalRevenue: 100000,
        growth: 50,
        countriesSupported: 20,
        transactions: 5000,
        users: [
          { avatar: 'https://example.com/avatar1.jpg' },
          { avatar: 'https://example.com/avatar2.jpg' },
          { avatar: 'https://example.com/avatar3.jpg' }
        ]
      };

      service.getLandingPageDetails().subscribe(response => {
        expect(response.users.length).toBe(3);
        expect(response.totalRevenue).toBe(100000);
        expect(response.countriesSupported).toBe(20);
      });

      const req = httpMock.expectOne(BASE_URL + APP_ENDPOINTS.LANDING_PAGE_DETAILS);
      req.flush(mockResponse);
    });

    it('should propagate HTTP errors', () => {
      service.getLandingPageDetails().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne(BASE_URL + APP_ENDPOINTS.LANDING_PAGE_DETAILS);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle 404 errors', () => {
      service.getLandingPageDetails().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(BASE_URL + APP_ENDPOINTS.LANDING_PAGE_DETAILS);
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('getLatestNews()', () => {
    it('should make a GET request to the news endpoint with count=1', () => {
      const mockResponse: MarketingNewsResponse[] = [
        {
          id: 'news-1',
          title: 'Latest Update',
          subtitle: 'Big news',
          content: 'Some content here',
          createdAt: '2026-02-16T10:00:00Z',
          updatedAt: '2026-02-16T10:00:00Z',
          deletedAt: ''
        }
      ];

      service.getLatestNews().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(BASE_URL + APP_ENDPOINTS.NEWS_LATEST + '1');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should return news article data', () => {
      const mockResponse: MarketingNewsResponse[] = [
        {
          id: 'news-1',
          title: 'Platform Launch',
          subtitle: 'We are live!',
          content: '<p>Platform is now available.</p>',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-15T00:00:00Z',
          deletedAt: ''
        }
      ];

      service.getLatestNews().subscribe(response => {
        expect(response.length).toBe(1);
        expect(response[0].title).toBe('Platform Launch');
        expect(response[0].subtitle).toBe('We are live!');
        expect(response[0].id).toBe('news-1');
      });

      const req = httpMock.expectOne(BASE_URL + APP_ENDPOINTS.NEWS_LATEST + '1');
      req.flush(mockResponse);
    });

    it('should handle an empty news response', () => {
      service.getLatestNews().subscribe(response => {
        expect(response).toEqual([]);
        expect(response.length).toBe(0);
      });

      const req = httpMock.expectOne(BASE_URL + APP_ENDPOINTS.NEWS_LATEST + '1');
      req.flush([]);
    });

    it('should propagate HTTP errors', () => {
      service.getLatestNews().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(503);
        }
      });

      const req = httpMock.expectOne(BASE_URL + APP_ENDPOINTS.NEWS_LATEST + '1');
      req.flush('Service unavailable', { status: 503, statusText: 'Service Unavailable' });
    });

    it('should construct the correct URL with the count appended', () => {
      service.getLatestNews().subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/marketing/news/latest/1'
      );
      expect(req.request.url).toBe(BASE_URL + '/marketing/news/latest/1');
      req.flush([]);
    });
  });

  describe('getCountryMarketData()', () => {
    it('should make a GET request to the country market data endpoint', () => {
      const mockResponse: CountryMarketData[] = [
        {
          iso3Code: 'USA',
          iso2Code: 'US',
          name: 'United States',
          creditCardPenetration: 65.5,
          mobilePenetration: 85.0
        }
      ];

      service.getCountryMarketData().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(BASE_URL + APP_ENDPOINTS.COUNTRY_MARKET_DATA);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });
});
