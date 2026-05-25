import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { LatestTransactionService } from './latest-transaction.service';
import { DashboardService } from './dashboard.service';
import { environment } from 'src/environments/environment';
import { TransactionFilterParams } from '@app-types/transaction-activity';
import { BehaviorSubject } from 'rxjs';

describe('LatestTransactionService', () => {
  let service: LatestTransactionService;
  let httpMock: HttpTestingController;
  let mockDashboardService: { selectedChannelObservable: BehaviorSubject<string> };
  const BASE_URL = environment.API_BASE;

  beforeEach(() => {
    mockDashboardService = {
      selectedChannelObservable: new BehaviorSubject<string>('test-channel-id')
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        LatestTransactionService,
        { provide: DashboardService, useValue: mockDashboardService }
      ]
    });
    service = TestBed.inject(LatestTransactionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getTransactionsList()', () => {
    it('should make a GET request with basic params', () => {
      const params: TransactionFilterParams = {
        sortBy: 'createdAt',
        sortOrder: 'desc',
        channelId: 'ch-123',
        page: 1,
        limit: 10
      };

      service.getTransactionsList(params).subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/transactions'
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('sortBy')).toBe('createdAt');
      expect(req.request.params.get('sortOrder')).toBe('desc');
      expect(req.request.params.get('channelId')).toBe('ch-123');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('limit')).toBe('10');
      req.flush({});
    });

    it('should handle optional date range params', () => {
      const params: TransactionFilterParams = {
        startDate: '2026-01-01',
        endDate: '2026-02-01',
        sortBy: 'createdAt',
        sortOrder: 'asc',
        channelId: 'ch-123',
        page: 1,
        limit: 20
      };

      service.getTransactionsList(params).subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/transactions'
      );
      expect(req.request.params.get('startDate')).toBe('2026-01-01');
      expect(req.request.params.get('endDate')).toBe('2026-02-01');
      req.flush({});
    });

    it('should handle optional amount range params', () => {
      const params: TransactionFilterParams = {
        amountGte: 10,
        amountLte: 100,
        sortBy: null,
        sortOrder: null,
        channelId: 'ch-123',
        page: 1,
        limit: 10
      };

      service.getTransactionsList(params).subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/transactions'
      );
      expect(req.request.params.get('amountGte')).toBe('10');
      expect(req.request.params.get('amountLte')).toBe('100');
      // null values should not be included
      expect(req.request.params.get('sortBy')).toBeNull();
      expect(req.request.params.get('sortOrder')).toBeNull();
      req.flush({});
    });

    it('should handle array params (countries) by appending each value', () => {
      const params: TransactionFilterParams = {
        countries: ['KE', 'UG', 'TZ'],
        sortBy: 'createdAt',
        sortOrder: 'desc',
        channelId: 'ch-123',
        page: 1,
        limit: 10
      };

      service.getTransactionsList(params).subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/transactions'
      );
      // Array values should be appended individually
      const countriesParams = req.request.params.getAll('countries');
      expect(countriesParams).toEqual(['KE', 'UG', 'TZ']);
      req.flush({});
    });

    it('should skip null and undefined values', () => {
      const params: TransactionFilterParams = {
        startDate: null,
        endDate: undefined as unknown as string,
        amountGte: null,
        amountLte: null,
        countries: null,
        operator: null,
        sortBy: null,
        sortOrder: null,
        channelId: 'ch-123',
        page: 1,
        limit: 10
      };

      service.getTransactionsList(params).subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/transactions'
      );
      expect(req.request.params.get('startDate')).toBeNull();
      expect(req.request.params.get('endDate')).toBeNull();
      expect(req.request.params.get('amountGte')).toBeNull();
      expect(req.request.params.get('amountLte')).toBeNull();
      expect(req.request.params.get('countries')).toBeNull();
      expect(req.request.params.get('operator')).toBeNull();
      expect(req.request.params.get('sortBy')).toBeNull();
      expect(req.request.params.get('sortOrder')).toBeNull();
      // Non-null values should be present
      expect(req.request.params.get('channelId')).toBe('ch-123');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('limit')).toBe('10');
      req.flush({});
    });

    it('should handle operator param', () => {
      const params: TransactionFilterParams = {
        operator: 'MPESA_KEN',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        channelId: 'ch-123',
        page: 2,
        limit: 25
      };

      service.getTransactionsList(params).subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/transactions'
      );
      expect(req.request.params.get('operator')).toBe('MPESA_KEN');
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('limit')).toBe('25');
      req.flush({});
    });

    it('should return the response data', () => {
      const mockResponse = {
        totalRecords: 50,
        page: 1,
        limit: 10,
        items: [
          {
            messageId: 'msg-1',
            messageContent: 'Hello',
            createdAt: '2026-02-16',
            country: 'Kenya',
            countryCode: 'KE',
            localAmount: 500,
            localCurrencyCode: 'KES',
            referralSource: 'organic',
            referralMedium: 'direct',
            revenueStatus: 'earned',
            replyDeadline: '2026-03-16'
          }
        ],
        availableCountries: []
      };

      const params: TransactionFilterParams = {
        sortBy: 'createdAt',
        sortOrder: 'desc',
        channelId: 'ch-123',
        page: 1,
        limit: 10
      };

      service.getTransactionsList(params).subscribe(response => {
        expect(response.totalRecords).toBe(50);
        expect(response.items.length).toBe(1);
        expect(response.items[0].messageId).toBe('msg-1');
      });

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/transactions'
      );
      req.flush(mockResponse);
    });

    it('should propagate HTTP errors', () => {
      const params: TransactionFilterParams = {
        sortBy: 'createdAt',
        sortOrder: 'desc',
        channelId: 'ch-123',
        page: 1,
        limit: 10
      };

      service.getTransactionsList(params).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/transactions'
      );
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('getMessageStats()', () => {
    it('should make a GET request with the selected channel id', () => {
      service.getMessageStats().subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/message-unit-statistics'
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('channelId')).toBe('test-channel-id');
      req.flush({});
    });

    it('should use updated channel id from dashboard service', () => {
      mockDashboardService.selectedChannelObservable.next('updated-channel');

      service.getMessageStats().subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/message-unit-statistics'
      );
      expect(req.request.params.get('channelId')).toBe('updated-channel');
      req.flush({});
    });

    it('should return message statistics data', () => {
      const mockResponse = {
        current30Days: { totalUsd: 100, averageUsd: 3.33, transactionCount: 30 },
        previous30Days: { totalUsd: 80, averageUsd: 2.67, transactionCount: 24 },
        changePercentage: 25,
        monthlyAverages: [{ month: '2026-01', averagePerDayUsd: 3.2 }],
        topCountries: [{
          countryCode: 'KE',
          countryName: 'Kenya',
          flag: '🇰🇪',
          totalUsd: 50
        }]
      };

      service.getMessageStats().subscribe(response => {
        expect(response.current30Days.totalUsd).toBe(100);
        expect(response.changePercentage).toBe(25);
        expect(response.topCountries[0].countryCode).toBe('KE');
      });

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/message-unit-statistics'
      );
      req.flush(mockResponse);
    });

    it('should propagate HTTP errors', () => {
      service.getMessageStats().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(401);
        }
      });

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/message-unit-statistics'
      );
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle empty channel id', () => {
      mockDashboardService.selectedChannelObservable.next('');

      service.getMessageStats().subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/creator-insights/message-unit-statistics'
      );
      expect(req.request.params.get('channelId')).toBe('');
      req.flush({});
    });
  });
});
