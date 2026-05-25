import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LatestTransactionDrawerComponent } from './latest-transaction-drawer.component';
import { LatestTransaction } from '@app-types/transaction-activity';
import { TRANSACTION_REVENUE_STATUS } from '@utils/enums';

describe('LatestTransactionDrawerComponent', () => {
  let component: LatestTransactionDrawerComponent;
  let fixture: ComponentFixture<LatestTransactionDrawerComponent>;

  const mockTransactions: LatestTransaction[] = [
    {
      messageId: 'msg-001',
      messageContent: 'Hello from Nigeria',
      createdAt: '2026-02-10T10:00:00Z',
      country: 'Nigeria',
      countryCode: 'NG',
      flag: 'flags/ng.svg',
      localAmount: 5000,
      localCurrencyCode: 'NGN',
      referralSource: 'youtube',
      referralMedium: 'livestream',
      revenueStatus: TRANSACTION_REVENUE_STATUS.Earned,
      multiplier: 1,
      replyDeadline: '2026-02-28',
      senderName: null,
      telegramMessageLink: null,
    },
    {
      messageId: 'msg-002',
      messageContent: 'Hello from Ghana',
      createdAt: '2026-02-11T10:00:00Z',
      country: 'Ghana',
      countryCode: 'GH',
      flag: 'flags/gh.svg',
      localAmount: 3000,
      localCurrencyCode: 'GHS',
      referralSource: 'youtube',
      referralMedium: 'video',
      revenueStatus: TRANSACTION_REVENUE_STATUS.AwaitingReply,
      multiplier: 2,
      replyDeadline: '2026-03-04',
      senderName: null,
      telegramMessageLink: null,
    },
    {
      messageId: 'msg-003',
      messageContent: 'Hello from Kenya',
      createdAt: '2026-02-12T10:00:00Z',
      country: 'Kenya',
      countryCode: 'KE',
      flag: 'flags/ke.svg',
      localAmount: 2000,
      localCurrencyCode: 'KES',
      referralSource: 'direct',
      referralMedium: 'livestream',
      revenueStatus: TRANSACTION_REVENUE_STATUS.AutoReplied,
      multiplier: 1,
      replyDeadline: '2026-03-09',
      senderName: null,
      telegramMessageLink: null,
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LatestTransactionDrawerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LatestTransactionDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('CurrentData getter', () => {
    it('should return the item at selectedOption index when data and selectedOption are set', () => {
      component.data = mockTransactions;
      component.selectedOption = 1;

      expect(component.CurrentData).toEqual(mockTransactions[1]);
    });

    it('should return the first item when selectedOption is 0', () => {
      component.data = mockTransactions;
      component.selectedOption = 0;

      expect(component.CurrentData).toEqual(mockTransactions[0]);
    });

    it('should return the last item when selectedOption is at the last index', () => {
      component.data = mockTransactions;
      component.selectedOption = 2;

      expect(component.CurrentData).toEqual(mockTransactions[2]);
    });

    it('should return null when data is empty and selectedOption is undefined', () => {
      component.data = [];
      (component as any).selectedOption = undefined;

      expect(component.CurrentData).toBeNull();
    });

    it('should return undefined element when selectedOption is out of bounds', () => {
      component.data = mockTransactions;
      component.selectedOption = 10;

      expect(component.CurrentData).toBeUndefined();
    });

    it('should return null when selectedOption is undefined', () => {
      component.data = mockTransactions;
      (component as any).selectedOption = undefined;

      expect(component.CurrentData).toBeNull();
    });
  });

  describe('goLeft', () => {
    beforeEach(() => {
      component.data = mockTransactions;
    });

    it('should decrement selectedOption when not at the first item', () => {
      component.selectedOption = 2;
      component.goLeft();

      expect(component.selectedOption).toBe(1);
    });

    it('should decrement selectedOption from 1 to 0', () => {
      component.selectedOption = 1;
      component.goLeft();

      expect(component.selectedOption).toBe(0);
    });

    it('should NOT decrement selectedOption when already at 0 (left boundary)', () => {
      component.selectedOption = 0;
      component.goLeft();

      expect(component.selectedOption).toBe(0);
    });
  });

  describe('goRight', () => {
    beforeEach(() => {
      component.data = mockTransactions;
    });

    it('should increment selectedOption when not at the last item', () => {
      component.selectedOption = 0;
      component.goRight();

      expect(component.selectedOption).toBe(1);
    });

    it('should increment selectedOption from middle to next', () => {
      component.selectedOption = 1;
      component.goRight();

      expect(component.selectedOption).toBe(2);
    });

    it('should NOT increment selectedOption when already at the last item (right boundary)', () => {
      component.selectedOption = 2;
      component.goRight();

      expect(component.selectedOption).toBe(2);
    });
  });

  describe('navigation with single item', () => {
    beforeEach(() => {
      component.data = [mockTransactions[0]];
      component.selectedOption = 0;
    });

    it('should not go left when there is only one item', () => {
      component.goLeft();
      expect(component.selectedOption).toBe(0);
    });

    it('should not go right when there is only one item', () => {
      component.goRight();
      expect(component.selectedOption).toBe(0);
    });
  });

  describe('navigation with empty array', () => {
    beforeEach(() => {
      component.data = [];
      component.selectedOption = 0;
    });

    it('should not go left with empty data', () => {
      component.goLeft();
      expect(component.selectedOption).toBe(0);
    });

    it('should not go right with empty data', () => {
      component.goRight();
      expect(component.selectedOption).toBe(0);
    });
  });

  describe('open', () => {
    it('should call show on offcanvasInstance when it exists', () => {
      const mockOffcanvas = { show: jasmine.createSpy('show'), hide: jasmine.createSpy('hide'), dispose: jasmine.createSpy('dispose') };
      (component as any).offcanvasInstance = mockOffcanvas;

      component.open();

      expect(mockOffcanvas.show).toHaveBeenCalled();
    });

    it('should not throw when offcanvasInstance is undefined', () => {
      (component as any).offcanvasInstance = undefined;

      expect(() => component.open()).not.toThrow();
    });
  });

  describe('closeDrawer', () => {
    it('should call hide on offcanvasInstance when it exists', () => {
      const mockOffcanvas = { show: jasmine.createSpy('show'), hide: jasmine.createSpy('hide'), dispose: jasmine.createSpy('dispose') };
      (component as any).offcanvasInstance = mockOffcanvas;

      component.closeDrawer();

      expect(mockOffcanvas.hide).toHaveBeenCalled();
    });

    it('should not throw when offcanvasInstance is undefined', () => {
      (component as any).offcanvasInstance = undefined;

      expect(() => component.closeDrawer()).not.toThrow();
    });
  });

  describe('ngAfterViewInit', () => {
    it('should set offcanvasInstance after view init (called during detectChanges)', () => {
      // ngAfterViewInit is called automatically during fixture.detectChanges() in beforeEach.
      // The Offcanvas constructor runs with the real template element (#offcanvasEl).
      // Verify that offcanvasInstance was assigned.
      expect((component as any).offcanvasInstance).toBeDefined();
    });
  });

  describe('ngOnDestroy', () => {
    it('should call dispose on offcanvasInstance when it exists', () => {
      const mockOffcanvas = { show: jasmine.createSpy('show'), hide: jasmine.createSpy('hide'), dispose: jasmine.createSpy('dispose') };
      (component as any).offcanvasInstance = mockOffcanvas;

      component.ngOnDestroy();

      expect(mockOffcanvas.dispose).toHaveBeenCalled();
    });

    it('should not throw when offcanvasInstance is undefined', () => {
      (component as any).offcanvasInstance = undefined;

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('initial state', () => {
    it('should initialize data as an empty array', () => {
      const freshFixture = TestBed.createComponent(LatestTransactionDrawerComponent);
      const freshComponent = freshFixture.componentInstance;

      expect(freshComponent.data).toEqual([]);
    });

    it('should initialize paymentStep as 1', () => {
      expect(component.paymentStep).toBe(1);
    });

    it('should have svgIcons defined', () => {
      expect(component.svgIcons).toBeDefined();
    });
  });
});
