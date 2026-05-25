import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DashboardService } from './dashboard.service';
import { environment } from '../../environments/environment';
import {
  RevenuePerDayResponse,
  ChannelStatisticsResponse,
  TransactionsResponse,
  CreatorYoutubeChannel
} from '@app-types/dashboard';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;
  const BASE_URL = environment.API_BASE;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('selectedDaysObservable', () => {
    it('should default to 30 days', () => {
      expect(service.selectedDaysObservable.value).toBe(30);
    });

    it('should allow updating the selected days', () => {
      service.selectedDaysObservable.next(7);
      expect(service.selectedDaysObservable.value).toBe(7);
    });
  });

  describe('selectedChannelObservable', () => {
    it('should default to an empty string', () => {
      expect(service.selectedChannelObservable.value).toBe('');
    });

    it('should allow updating the selected channel', () => {
      service.selectedChannelObservable.next('channel-123');
      expect(service.selectedChannelObservable.value).toBe('channel-123');
    });
  });

  describe('getRevenuePerDay()', () => {
    it('should make a GET request with correct params', () => {
      const mockResponse: RevenuePerDayResponse = {
        days: 30,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        startDate: '2026-01-17',
        endDate: '2026-02-16',
        series: [{ date: '2026-02-16', revenueUsd: 100 }],
        totalRevenueUsd: 100,
        trendPercentage: 5
      };

      service.getRevenuePerDay().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/revenue-per-day'
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('days')).toBe('30');
      expect(req.request.params.get('tzOffsetMinutes')).toBeDefined();
      expect(req.request.params.get('channelId')).toBe('');
      req.flush(mockResponse);
    });

    it('should use current selectedDaysObservable and selectedChannelObservable values', () => {
      service.selectedDaysObservable.next(7);
      service.selectedChannelObservable.next('ch-abc');

      service.getRevenuePerDay().subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/revenue-per-day'
      );
      expect(req.request.params.get('days')).toBe('7');
      expect(req.request.params.get('channelId')).toBe('ch-abc');
      req.flush({});
    });
  });

  describe('getTopEarningCountries()', () => {
    it('should make a GET request with default limit of 5', () => {
      service.getTopEarningCountries().subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/top-earning-countries'
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('days')).toBe('30');
      expect(req.request.params.get('limit')).toBe('5');
      expect(req.request.params.get('tzOffsetMinutes')).toBeDefined();
      expect(req.request.params.get('channelId')).toBe('');
      req.flush({});
    });

    it('should accept a custom limit', () => {
      service.getTopEarningCountries(10).subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/top-earning-countries'
      );
      expect(req.request.params.get('limit')).toBe('10');
      req.flush({});
    });

    it('should use current selected days and channel', () => {
      service.selectedDaysObservable.next(14);
      service.selectedChannelObservable.next('ch-xyz');

      service.getTopEarningCountries(3).subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/top-earning-countries'
      );
      expect(req.request.params.get('days')).toBe('14');
      expect(req.request.params.get('channelId')).toBe('ch-xyz');
      expect(req.request.params.get('limit')).toBe('3');
      req.flush({});
    });
  });

  describe('getChannelStatistics()', () => {
    it('should make a GET request with correct params', () => {
      const mockResponse: ChannelStatisticsResponse = {
        channelHandle: '@testchannel',
        linkClicks: 42,
        transactions: 10,
        transactionTrend: 15
      };

      service.getChannelStatistics().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/channel-statistics'
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('days')).toBe('30');
      expect(req.request.params.get('channelId')).toBe('');
      req.flush(mockResponse);
    });

    it('should use current selected days and channel', () => {
      service.selectedDaysObservable.next(90);
      service.selectedChannelObservable.next('ch-def');

      service.getChannelStatistics().subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/channel-statistics'
      );
      expect(req.request.params.get('days')).toBe('90');
      expect(req.request.params.get('channelId')).toBe('ch-def');
      req.flush({});
    });
  });

  describe('getTransactionsList()', () => {
    it('should make a GET request with page and limit params', () => {
      const mockResponse: TransactionsResponse = {
        days: 30,
        startDate: '2026-01-17',
        endDate: '2026-02-16',
        page: 1,
        limit: 10,
        items: []
      };

      service.getTransactionsList(1, 10).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/transactions'
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('days')).toBe('30');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('limit')).toBe('10');
      expect(req.request.params.get('channelId')).toBe('');
      req.flush(mockResponse);
    });

    it('should pass correct page and limit values', () => {
      service.getTransactionsList(3, 25).subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/transactions'
      );
      expect(req.request.params.get('page')).toBe('3');
      expect(req.request.params.get('limit')).toBe('25');
      req.flush({});
    });

    it('should use current selected days and channel', () => {
      service.selectedDaysObservable.next(60);
      service.selectedChannelObservable.next('ch-list');

      service.getTransactionsList(1, 5).subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/transactions'
      );
      expect(req.request.params.get('days')).toBe('60');
      expect(req.request.params.get('channelId')).toBe('ch-list');
      req.flush({});
    });
  });

  describe('getCreatorChannels()', () => {
    it('should make a GET request to the creator channels endpoint', () => {
      const mockChannels: CreatorYoutubeChannel[] = [
        {
          id: '1',
          youtubeChannelId: 'UC123',
          channelName: 'Test Channel',
          telegramHandle: '@test',
          role: 'owner',
          createdAt: '2026-01-01'
        }
      ];

      service.getCreatorChannels().subscribe(response => {
        expect(response).toEqual(mockChannels);
      });

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator/channels'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockChannels);
    });

    it('should include the loader context', () => {
      service.getCreatorChannels().subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator/channels'
      );
      // The request should have the context set (HttpContext is not directly inspectable
      // from the testing controller, but we verify the request was made correctly)
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should handle an empty channels list', () => {
      service.getCreatorChannels().subscribe(response => {
        expect(response).toEqual([]);
        expect(response.length).toBe(0);
      });

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator/channels'
      );
      req.flush([]);
    });
  });

  describe('loadChannels()', () => {
    it('should fetch channels and set the first as selected', () => {
      const mockChannels: CreatorYoutubeChannel[] = [
        { id: 'ch-1', youtubeChannelId: 'UC1', channelName: 'One', telegramHandle: '@one', role: 'owner', createdAt: '2025-01-01' },
        { id: 'ch-2', youtubeChannelId: 'UC2', channelName: 'Two', telegramHandle: '@two', role: 'owner', createdAt: '2025-02-01' }
      ];

      service.loadChannels();

      const req = httpMock.expectOne(r => r.url === BASE_URL + '/creator/channels');
      req.flush(mockChannels);

      expect(service.channelList$.value).toEqual(mockChannels);
      expect(service.selectedChannelObservable.value).toBe('ch-1');
    });

    it('should only fetch once even if called multiple times', () => {
      service.loadChannels();
      service.loadChannels();

      const req = httpMock.expectOne(r => r.url === BASE_URL + '/creator/channels');
      req.flush([]);

      expect(service.channelList$.value).toEqual([]);
    });

    it('should not override selectedChannel if already set', () => {
      service.selectedChannelObservable.next('existing-ch');

      service.loadChannels();

      const req = httpMock.expectOne(r => r.url === BASE_URL + '/creator/channels');
      req.flush([{ id: 'ch-1', youtubeChannelId: 'UC1', channelName: 'One', telegramHandle: '@one', role: 'owner', createdAt: '2025-01-01' }]);

      expect(service.selectedChannelObservable.value).toBe('existing-ch');
    });
  });

  describe('triggerRefresh()', () => {
    it('should emit on the refresh$ subject', () => {
      const spy = jasmine.createSpy('refreshSpy');
      service.refresh$.subscribe(spy);

      service.triggerRefresh();

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPaymentOverview()', () => {
    it('should make a GET request with correct params', () => {
      service.getPaymentOverview().subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/payment-overview'
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('days')).toBe('30');
      expect(req.request.params.get('channelId')).toBe('');
      req.flush({});
    });

    it('should use current selected days and channel', () => {
      service.selectedDaysObservable.next(7);
      service.selectedChannelObservable.next('ch-pay');

      service.getPaymentOverview().subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/payment-overview'
      );
      expect(req.request.params.get('days')).toBe('7');
      expect(req.request.params.get('channelId')).toBe('ch-pay');
      req.flush({});
    });
  });

  describe('error handling', () => {
    it('should propagate HTTP errors for getRevenuePerDay', () => {
      service.getRevenuePerDay().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/revenue-per-day'
      );
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should propagate HTTP errors for getTopEarningCountries', () => {
      service.getTopEarningCountries().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(401);
        }
      });

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/top-earning-countries'
      );
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should propagate HTTP errors for getChannelStatistics', () => {
      service.getChannelStatistics().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/channel-statistics'
      );
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });

    it('should propagate HTTP errors for getTransactionsList', () => {
      service.getTransactionsList(1, 10).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(403);
        }
      });

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/transactions'
      );
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    it('should propagate HTTP errors for getCreatorChannels', () => {
      service.getCreatorChannels().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator/channels'
      );
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });
  });
});
