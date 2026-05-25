import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { createMockFirebaseAuth } from '../../../../../../testing/mocks/firebase-auth.mock';
import { createMockHttpClient } from '../../../../../../testing/mocks/http.mock';
import { TokenService } from '@services/token.service';
import { LatestTransactionService } from '@services/latest-transaction.service';
import { DashboardService } from '@services/dashboard.service';
import { LatestTransaction, LatestTransactionResponse, TransactionFilter } from '@app-types/transaction-activity';
import { TRANSACTION_REVENUE_STATUS } from '@utils/enums';

import { LatestTransactionComponent } from './latest-transaction.component';

function createMockTransaction(overrides: Partial<LatestTransaction> = {}): LatestTransaction {
  return {
    messageId: 'msg-1',
    messageContent: 'Hello world',
    createdAt: '2025-01-01T00:00:00Z',
    country: 'Kenya',
    countryCode: 'KEN',
    localAmount: 100,
    localCurrencyCode: 'KES',
    referralSource: 'youtube',
    referralMedium: 'video',
    revenueStatus: TRANSACTION_REVENUE_STATUS.Earned,
    multiplier: 1,
    replyDeadline: '2025-02-01T00:00:00Z',
    senderName: null,
    telegramMessageLink: null,
    ...overrides,
  };
}

function createMockResponse(overrides: Partial<LatestTransactionResponse> = {}): LatestTransactionResponse {
  return {
    totalRecords: 1,
    page: 1,
    limit: 20,
    items: [createMockTransaction()],
    availableCountries: [
      { countryCode: 'KEN', countryName: 'Kenya', currencies: ['KES'] },
    ],
    ...overrides,
  };
}

describe('LatestTransactionComponent', () => {
  let component: LatestTransactionComponent;
  let fixture: ComponentFixture<LatestTransactionComponent>;
  let mockDashboardService: {
    selectedChannelObservable: BehaviorSubject<string>;
    selectedDaysObservable: BehaviorSubject<number>;
  };
  let mockTransactionService: {
    getTransactionsList: jasmine.Spy;
  };

  beforeEach(async () => {
    mockDashboardService = {
      selectedChannelObservable: new BehaviorSubject<string>('channel-1'),
      selectedDaysObservable: new BehaviorSubject<number>(30),
    };

    mockTransactionService = {
      getTransactionsList: jasmine.createSpy('getTransactionsList').and.returnValue(of(createMockResponse())),
    };

    await TestBed.configureTestingModule({
      imports: [LatestTransactionComponent],
      providers: [
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: HttpClient, useValue: createMockHttpClient() },
        { provide: TokenService, useValue: jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() }) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], { events: of(), url: '/' }) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}), queryParams: of({}) } },
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: LatestTransactionService, useValue: mockTransactionService },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LatestTransactionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── ngOnInit ──────────────────────────────────────────────────────────
  describe('ngOnInit', () => {
    it('should call subYtChannelChange on init', () => {
      // subYtChannelChange was already called via ngOnInit in beforeEach
      // Verify that getTransactionsList was called since channel-1 is truthy
      expect(mockTransactionService.getTransactionsList).toHaveBeenCalled();
    });

    it('should set isLoading to false after data loads', () => {
      expect(component.isLoading).toBeFalse();
    });

    it('should populate transactionData after init', () => {
      expect(component.transactionData).toBeDefined();
      expect(component.transactionData.items.length).toBe(1);
    });
  });

  // ── ngOnDestroy ───────────────────────────────────────────────────────
  describe('ngOnDestroy', () => {
    it('should unsubscribe all subscriptions on destroy', () => {
      const subSpy1 = jasmine.createSpyObj('Subscription', ['unsubscribe']);
      const subSpy2 = jasmine.createSpyObj('Subscription', ['unsubscribe']);
      component.unSubscribe.push(subSpy1, subSpy2);

      component.ngOnDestroy();

      // The original subscription from subYtChannelChange is already in unSubscribe,
      // plus we added two more. All should have unsubscribe called.
      expect(subSpy1.unsubscribe).toHaveBeenCalledTimes(1);
      expect(subSpy2.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('should handle empty unSubscribe array gracefully', () => {
      component.unSubscribe = [];
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  // ── subYtChannelChange ────────────────────────────────────────────────
  describe('subYtChannelChange', () => {
    it('should fetch transactions when channel changes to a truthy value', () => {
      mockTransactionService.getTransactionsList.calls.reset();

      mockDashboardService.selectedChannelObservable.next('channel-2');

      expect(mockTransactionService.getTransactionsList).toHaveBeenCalledTimes(1);
    });

    it('should NOT fetch transactions when channel is null', () => {
      mockTransactionService.getTransactionsList.calls.reset();

      mockDashboardService.selectedChannelObservable.next(null as unknown as string);

      expect(mockTransactionService.getTransactionsList).not.toHaveBeenCalled();
    });

    it('should NOT fetch transactions when channel is empty string', () => {
      mockTransactionService.getTransactionsList.calls.reset();

      mockDashboardService.selectedChannelObservable.next('');

      expect(mockTransactionService.getTransactionsList).not.toHaveBeenCalled();
    });

    it('should push subscriptions to unSubscribe array', () => {
      const initialLength = component.unSubscribe.length;
      component.subYtChannelChange();
      // subYtChannelChange adds 1 subscription for the channel observable,
      // and since BehaviorSubject emits 'channel-1' immediately, getTransactionsList
      // is also called which adds another subscription
      expect(component.unSubscribe.length).toBeGreaterThan(initialLength);
    });
  });

  // ── getTransactionsList ───────────────────────────────────────────────
  describe('getTransactionsList', () => {
    beforeEach(() => {
      mockTransactionService.getTransactionsList.calls.reset();
    });

    it('should set isLoading to true while fetching', () => {
      // We need to check loading before subscription completes
      let loadingDuringCall = false;
      mockTransactionService.getTransactionsList.and.callFake(() => {
        loadingDuringCall = component.isLoading;
        return of(createMockResponse());
      });

      component.getTransactionsList();
      expect(loadingDuringCall).toBeTrue();
    });

    it('should set isLoading to false after successful fetch', () => {
      component.getTransactionsList();
      expect(component.isLoading).toBeFalse();
    });

    it('should set isLoading to false on error', () => {
      mockTransactionService.getTransactionsList.and.returnValue(throwError(() => new Error('fail')));
      component.getTransactionsList();
      expect(component.isLoading).toBeFalse();
    });

    it('should populate transactionData on success', () => {
      const response = createMockResponse({
        items: [
          createMockTransaction({ messageId: 'msg-A' }),
          createMockTransaction({ messageId: 'msg-B' }),
        ],
        totalRecords: 2,
      });
      mockTransactionService.getTransactionsList.and.returnValue(of(response));

      component.getTransactionsList();

      expect(component.transactionData.items.length).toBe(2);
      expect(component.transactionData.totalRecords).toBe(2);
    });

    it('should assign flag urls to transaction items', () => {
      const response = createMockResponse({
        items: [createMockTransaction({ countryCode: 'KEN' })],
      });
      mockTransactionService.getTransactionsList.and.returnValue(of(response));

      component.getTransactionsList();

      // GetFlagUrl converts ISO 3166-1 alpha-3 to alpha-2 and builds a URL
      expect(component.transactionData.items[0].flag).toBeDefined();
    });

    it('should assign flag img urls to availableCountries', () => {
      const response = createMockResponse({
        availableCountries: [
          { countryCode: 'KEN', countryName: 'Kenya', currencies: ['KES'] },
          { countryCode: 'USA', countryName: 'United States', currencies: ['USD'] },
        ],
      });
      mockTransactionService.getTransactionsList.and.returnValue(of(response));

      component.getTransactionsList();

      component.transactionData.availableCountries.forEach(country => {
        expect(country.img).toBeDefined();
      });
    });

    it('should send correct params without date filter', () => {
      component.filterObj = { country: null, status: null, dateRange: null, sortBy: null, sortOrder: null };
      component.page = 2;
      component.limit = 10;
      component.selectedSortBy = 'country';
      component.selectedSortOrder = 'desc';

      component.getTransactionsList();

      const params = mockTransactionService.getTransactionsList.calls.mostRecent().args[0];
      expect(params.startDate).toBeNull();
      expect(params.endDate).toBeNull();
      expect(params.page).toBe(2);
      expect(params.limit).toBe(10);
      expect(params.sortBy).toBe('country');
      expect(params.sortOrder).toBe('desc');
      expect(params.channelId).toBe('channel-1');
    });

    it('should send date params when dateRange filter is set', () => {
      component.filterObj = { country: null, status: null, dateRange: 7, sortBy: null, sortOrder: null };

      component.getTransactionsList();

      const params = mockTransactionService.getTransactionsList.calls.mostRecent().args[0];
      expect(params.startDate).toBeTruthy();
      expect(params.endDate).toBeTruthy();
      // startDate should be a date string in YYYY-MM-DD format
      expect(params.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(params.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should send country filter when set', () => {
      component.filterObj = { country: ['KEN', 'USA'], status: null, dateRange: null, sortBy: null, sortOrder: null };

      component.getTransactionsList();

      const params = mockTransactionService.getTransactionsList.calls.mostRecent().args[0];
      expect(params.countries).toEqual(['KEN', 'USA']);
    });

    it('should push subscription into unSubscribe array', () => {
      const initialLength = component.unSubscribe.length;
      component.getTransactionsList();
      expect(component.unSubscribe.length).toBe(initialLength + 1);
    });

    it('should use the current selectedChannelObservable value for channelId', () => {
      mockDashboardService.selectedChannelObservable.next('channel-XYZ');
      mockTransactionService.getTransactionsList.calls.reset();
      // Need to call manually since the subscription already triggered
      component.getTransactionsList();

      const params = mockTransactionService.getTransactionsList.calls.mostRecent().args[0];
      expect(params.channelId).toBe('channel-XYZ');
    });

    it('should handle dateRange of 0 as "Today" filter (startDate = endDate = today)', () => {
      component.filterObj = { country: null, status: null, dateRange: 0, sortBy: null, sortOrder: null };

      component.getTransactionsList();

      const params = mockTransactionService.getTransactionsList.calls.mostRecent().args[0];
      const today = new Date().toISOString().split('T')[0];
      expect(params.startDate).toBe(today);
      expect(params.endDate).toBe(today);
    });
  });

  // ── onPageChange ──────────────────────────────────────────────────────
  describe('onPageChange', () => {
    beforeEach(() => {
      mockTransactionService.getTransactionsList.calls.reset();
    });

    it('should update page and refetch', () => {
      component.onPageChange(3);
      expect(component.page).toBe(3);
      expect(mockTransactionService.getTransactionsList).toHaveBeenCalledTimes(1);
    });

    it('should set page to 1', () => {
      component.page = 5;
      component.onPageChange(1);
      expect(component.page).toBe(1);
    });
  });

  // ── onPageSizeChange ──────────────────────────────────────────────────
  describe('onPageSizeChange', () => {
    beforeEach(() => {
      mockTransactionService.getTransactionsList.calls.reset();
    });

    it('should update limit and refetch', () => {
      component.onPageSizeChange(50);
      expect(component.limit).toBe(50);
      expect(mockTransactionService.getTransactionsList).toHaveBeenCalledTimes(1);
    });
  });

  // ── handleReloadData ──────────────────────────────────────────────────
  describe('handleReloadData', () => {
    beforeEach(() => {
      mockTransactionService.getTransactionsList.calls.reset();
    });

    it('should update both page and limit, then refetch', () => {
      component.handleReloadData({ page: 2, size: 50 });
      expect(component.page).toBe(2);
      expect(component.limit).toBe(50);
      expect(mockTransactionService.getTransactionsList).toHaveBeenCalledTimes(1);
    });

    it('should set page to 1 and size to 10', () => {
      component.handleReloadData({ page: 1, size: 10 });
      expect(component.page).toBe(1);
      expect(component.limit).toBe(10);
    });
  });

  // ── viewMessage ───────────────────────────────────────────────────────
  describe('viewMessage', () => {
    it('should stop propagation and set selectedTransaction', () => {
      const mockEvent = { stopPropagation: jasmine.createSpy('stopPropagation') } as unknown as MouseEvent;
      const transaction = createMockTransaction({ messageId: 'msg-view' });

      component.viewMessage(mockEvent, transaction);

      expect(mockEvent.stopPropagation).toHaveBeenCalledTimes(1);
      expect(component.selectedTransaction).toEqual(transaction);
    });

    it('should handle null event gracefully', () => {
      const transaction = createMockTransaction();
      // event is falsy but the if-check handles it
      expect(() => component.viewMessage(null as unknown as MouseEvent, transaction)).not.toThrow();
      expect(component.selectedTransaction).toEqual(transaction);
    });
  });

  // ── filterModalClose ──────────────────────────────────────────────────
  describe('filterModalClose', () => {
    beforeEach(() => {
      component.isFilterModalOpen = true;
      mockTransactionService.getTransactionsList.calls.reset();
    });

    it('should close filter modal and update filterObj', () => {
      const filter: TransactionFilter = {
        country: ['KEN'],
        status: ['earned'],
        dateRange: 30,
        sortBy: 'country',
        sortOrder: 'asc',
      };

      component.filterModalClose(filter);

      expect(component.isFilterModalOpen).toBeFalse();
      expect(component.filterObj).toEqual(filter);
    });

    it('should refetch transactions when filter is NOT canceled', () => {
      const filter: TransactionFilter = {
        country: null,
        status: null,
        dateRange: 7,
        sortBy: null,
        sortOrder: null,
        canceled: false,
      };

      component.filterModalClose(filter);

      expect(mockTransactionService.getTransactionsList).toHaveBeenCalledTimes(1);
    });

    it('should NOT refetch transactions when filter is canceled', () => {
      const filter: TransactionFilter = {
        country: null,
        status: null,
        dateRange: null,
        sortBy: null,
        sortOrder: null,
        canceled: true,
      };

      component.filterModalClose(filter);

      expect(mockTransactionService.getTransactionsList).not.toHaveBeenCalled();
    });

    it('should refetch when canceled is undefined (falsy)', () => {
      const filter: TransactionFilter = {
        country: null,
        status: null,
        dateRange: null,
        sortBy: null,
        sortOrder: null,
      };

      component.filterModalClose(filter);

      expect(mockTransactionService.getTransactionsList).toHaveBeenCalledTimes(1);
    });

    it('should refetch when canceled is null (falsy)', () => {
      const filter: TransactionFilter = {
        country: null,
        status: null,
        dateRange: null,
        sortBy: null,
        sortOrder: null,
        canceled: null,
      };

      component.filterModalClose(filter);

      expect(mockTransactionService.getTransactionsList).toHaveBeenCalledTimes(1);
    });
  });

  // ── messageModalClose ─────────────────────────────────────────────────
  describe('messageModalClose', () => {
    it('should reset selectedTransaction and close message modal', () => {
      component.selectedTransaction = createMockTransaction();
      component.isMessageModalOpen = true;

      component.messageModalClose();

      expect(component.selectedTransaction).toBeNull();
      expect(component.isMessageModalOpen).toBeFalse();
    });

    it('should work when already in default state', () => {
      component.selectedTransaction = null;
      component.isMessageModalOpen = false;

      component.messageModalClose();

      expect(component.selectedTransaction).toBeNull();
      expect(component.isMessageModalOpen).toBeFalse();
    });
  });

  // ── toggleDropdown ────────────────────────────────────────────────────
  describe('toggleDropdown', () => {
    it('should stop propagation and toggle dropdown open', () => {
      const mockEvent = { stopPropagation: jasmine.createSpy('stopPropagation') } as unknown as MouseEvent;
      component.isSortDropdownOpen = false;

      component.toggleDropdown(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalledTimes(1);
      expect(component.isSortDropdownOpen).toBeTrue();
    });

    it('should toggle dropdown closed when already open', () => {
      const mockEvent = { stopPropagation: jasmine.createSpy('stopPropagation') } as unknown as MouseEvent;
      component.isSortDropdownOpen = true;

      component.toggleDropdown(mockEvent);

      expect(component.isSortDropdownOpen).toBeFalse();
    });

    it('should call stopPropagation each time', () => {
      const mockEvent = { stopPropagation: jasmine.createSpy('stopPropagation') } as unknown as MouseEvent;

      component.toggleDropdown(mockEvent);
      component.toggleDropdown(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalledTimes(2);
    });
  });

  // ── onSortByClick ─────────────────────────────────────────────────────
  describe('onSortByClick', () => {
    beforeEach(() => {
      mockTransactionService.getTransactionsList.calls.reset();
    });

    it('should set selectedSortBy to country and refetch', () => {
      component.onSortByClick('country');
      expect(component.selectedSortBy).toBe('country');
      expect(mockTransactionService.getTransactionsList).toHaveBeenCalledTimes(1);
    });

    it('should set selectedSortBy to revenueStatus and refetch', () => {
      component.onSortByClick('revenueStatus');
      expect(component.selectedSortBy).toBe('revenueStatus');
      expect(mockTransactionService.getTransactionsList).toHaveBeenCalledTimes(1);
    });

    it('should set selectedSortBy to multiplier and refetch', () => {
      component.onSortByClick('multiplier');
      expect(component.selectedSortBy).toBe('multiplier');
      expect(mockTransactionService.getTransactionsList).toHaveBeenCalledTimes(1);
    });

    it('should set selectedSortBy to amount and refetch', () => {
      component.onSortByClick('amount');
      expect(component.selectedSortBy).toBe('amount');
      expect(mockTransactionService.getTransactionsList).toHaveBeenCalledTimes(1);
    });

    it('should set selectedSortBy to createdAt and refetch', () => {
      component.onSortByClick('createdAt');
      expect(component.selectedSortBy).toBe('createdAt');
      expect(mockTransactionService.getTransactionsList).toHaveBeenCalledTimes(1);
    });

    it('should use new sortBy in the service call params', () => {
      component.onSortByClick('revenueStatus');

      const params = mockTransactionService.getTransactionsList.calls.mostRecent().args[0];
      expect(params.sortBy).toBe('revenueStatus');
    });
  });

  // ── onSortOrderClick ──────────────────────────────────────────────────
  describe('onSortOrderClick', () => {
    beforeEach(() => {
      mockTransactionService.getTransactionsList.calls.reset();
    });

    it('should set selectedSortOrder to desc and refetch', () => {
      component.onSortOrderClick('desc');
      expect(component.selectedSortOrder).toBe('desc');
      expect(mockTransactionService.getTransactionsList).toHaveBeenCalledTimes(1);
    });

    it('should set selectedSortOrder to asc and refetch', () => {
      component.onSortOrderClick('asc');
      expect(component.selectedSortOrder).toBe('asc');
      expect(mockTransactionService.getTransactionsList).toHaveBeenCalledTimes(1);
    });

    it('should use new sortOrder in the service call params', () => {
      component.onSortOrderClick('desc');

      const params = mockTransactionService.getTransactionsList.calls.mostRecent().args[0];
      expect(params.sortOrder).toBe('desc');
    });
  });

  // ── onClickOutside (HostListener) ─────────────────────────────────────
  describe('onClickOutside', () => {
    it('should close sort dropdown when clicking outside', () => {
      component.isSortDropdownOpen = true;

      const mockEvent = { target: document.createElement('div') } as unknown as MouseEvent;
      component.onClickOutside(mockEvent);

      expect(component.isSortDropdownOpen).toBeFalse();
    });

    it('should remain closed if already closed', () => {
      component.isSortDropdownOpen = false;

      const mockEvent = { target: document.createElement('div') } as unknown as MouseEvent;
      component.onClickOutside(mockEvent);

      expect(component.isSortDropdownOpen).toBeFalse();
    });

    it('should not throw if event has no target', () => {
      component.isSortDropdownOpen = true;
      // When event.target is null, the if guard prevents execution
      const mockEvent = { target: null } as unknown as MouseEvent;
      component.onClickOutside(mockEvent);

      // isSortDropdownOpen stays true because if condition fails
      expect(component.isSortDropdownOpen).toBeTrue();
    });

    it('should not throw if event is null', () => {
      component.isSortDropdownOpen = true;
      // null event fails the outer if check
      expect(() => component.onClickOutside(null as unknown as MouseEvent)).not.toThrow();
    });
  });

  // ── Default / initial state ───────────────────────────────────────────
  describe('initial state', () => {
    it('should have default page of 1', () => {
      expect(component.page).toBe(1);
    });

    it('should have default limit of 20', () => {
      expect(component.limit).toBe(20);
    });

    it('should have default sort by createdAt', () => {
      expect(component.selectedSortBy).toBe('createdAt');
    });

    it('should have default sort order desc', () => {
      expect(component.selectedSortOrder).toBe('desc');
    });

    it('should have isMessageModalOpen as false', () => {
      expect(component.isMessageModalOpen).toBeFalse();
    });

    it('should have isFilterModalOpen as false', () => {
      expect(component.isFilterModalOpen).toBeFalse();
    });

    it('should have isSortDropdownOpen as false', () => {
      expect(component.isSortDropdownOpen).toBeFalse();
    });

    it('should have selectedTransaction as null', () => {
      expect(component.selectedTransaction).toBeNull();
    });

    it('should have sortByList with 5 options', () => {
      expect(component.sortByList.length).toBe(5);
      expect(component.sortByList.map(s => s.key)).toEqual(['createdAt', 'amount', 'country', 'revenueStatus', 'multiplier']);
    });

    it('should have sortOrderList with 2 options', () => {
      expect(component.sortOrderList.length).toBe(2);
      expect(component.sortOrderList.map(s => s.key)).toEqual(['asc', 'desc']);
    });

    it('should have TRANSACTION_REVENUE_STATUS enum available', () => {
      expect(component.TRANSACTION_REVENUE_STATUS).toBe(TRANSACTION_REVENUE_STATUS);
    });

    it('should have a default filterObj with all null values', () => {
      expect(component.filterObj.country).toBeNull();
      expect(component.filterObj.status).toBeNull();
      expect(component.filterObj.dateRange).toBeNull();
      expect(component.filterObj.sortBy).toBeNull();
      expect(component.filterObj.sortOrder).toBeNull();
    });

    it('should have hasActiveSort as false with defaults', () => {
      expect(component.hasActiveSort).toBeFalse();
    });
  });

  // ── hasActiveSort ─────────────────────────────────────────────────────
  describe('hasActiveSort', () => {
    it('should return false when sortBy is createdAt and order is desc', () => {
      component.selectedSortBy = 'createdAt';
      component.selectedSortOrder = 'desc';
      expect(component.hasActiveSort).toBeFalse();
    });

    it('should return true when sortBy is not createdAt', () => {
      component.selectedSortBy = 'amount';
      component.selectedSortOrder = 'desc';
      expect(component.hasActiveSort).toBeTrue();
    });

    it('should return true when sortOrder is asc', () => {
      component.selectedSortBy = 'createdAt';
      component.selectedSortOrder = 'asc';
      expect(component.hasActiveSort).toBeTrue();
    });

    it('should return true when both are non-default', () => {
      component.selectedSortBy = 'country';
      component.selectedSortOrder = 'asc';
      expect(component.hasActiveSort).toBeTrue();
    });
  });

  // ── resetSort ─────────────────────────────────────────────────────────
  describe('resetSort', () => {
    beforeEach(() => {
      mockTransactionService.getTransactionsList.calls.reset();
    });

    it('should reset sort to defaults and refetch', () => {
      component.selectedSortBy = 'amount';
      component.selectedSortOrder = 'asc';

      component.resetSort();

      expect(component.selectedSortBy).toBe('createdAt');
      expect(component.selectedSortOrder).toBe('desc');
      expect(mockTransactionService.getTransactionsList).toHaveBeenCalledTimes(1);
    });

    it('should stop event propagation when event is provided', () => {
      const mockEvent = jasmine.createSpyObj('MouseEvent', ['stopPropagation']);
      component.resetSort(mockEvent);
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });

  // ── resetFilters ──────────────────────────────────────────────────────
  describe('resetFilters', () => {
    beforeEach(() => {
      mockTransactionService.getTransactionsList.calls.reset();
    });

    it('should reset filters, search, and page then refetch', () => {
      component.filterObj = { country: ['KEN'], status: ['earned'], dateRange: 30 };
      component.searchTerm = 'test';
      component.page = 3;

      component.resetFilters();

      expect(component.filterObj.country).toBeNull();
      expect(component.filterObj.status).toBeNull();
      expect(component.filterObj.dateRange).toBeNull();
      expect(component.searchTerm).toBe('');
      expect(component.page).toBe(1);
      expect(mockTransactionService.getTransactionsList).toHaveBeenCalledTimes(1);
    });

    it('should stop event propagation when event is provided', () => {
      const mockEvent = jasmine.createSpyObj('MouseEvent', ['stopPropagation']);
      component.resetFilters(mockEvent);
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });

  // ── resetAll ──────────────────────────────────────────────────────────
  describe('resetAll', () => {
    beforeEach(() => {
      mockTransactionService.getTransactionsList.calls.reset();
    });

    it('should reset both sort and filters then refetch once', () => {
      component.selectedSortBy = 'amount';
      component.selectedSortOrder = 'asc';
      component.filterObj = { country: ['KEN'], status: ['earned'], dateRange: 30 };
      component.searchTerm = 'test';
      component.page = 5;

      component.resetAll();

      expect(component.selectedSortBy).toBe('createdAt');
      expect(component.selectedSortOrder).toBe('desc');
      expect(component.filterObj.country).toBeNull();
      expect(component.filterObj.status).toBeNull();
      expect(component.searchTerm).toBe('');
      expect(component.page).toBe(1);
      expect(mockTransactionService.getTransactionsList).toHaveBeenCalledTimes(1);
    });
  });
});
