import { ComponentFixture, TestBed } from '@angular/core/testing';
import * as bootstrap from 'bootstrap';

import { PaymentOverviewDrawerComponent } from './payment-overview-drawer.component';
import { PaymentOverviewItem } from '@app-types/dashboard';

const mockOffcanvasInstance = { show: jasmine.createSpy('show'), hide: jasmine.createSpy('hide'), dispose: jasmine.createSpy('dispose') };

describe('PaymentOverviewDrawerComponent', () => {
  let component: PaymentOverviewDrawerComponent;
  let fixture: ComponentFixture<PaymentOverviewDrawerComponent>;
  let getInstanceSpy: jasmine.Spy;
  let getOrCreateSpy: jasmine.Spy;

  const mockItems: PaymentOverviewItem[] = [
    {
      countryCode: 'NGA',
      flag: 'flags/ng.svg',
      localCurrencyCode: 'NGN',
      hasAccount: true,
      totalLocal: 5000,
      totalUsd: 12.5,
      nextPayAmountLocal: 4500,
      nextPayAmountUsd: 11.25,
      nextPayDate: '2026-03-01',
      premiumMessages: 10,
      livestreamMessages: 7,
      videoMessages: 3,
      mobileNumber: '+234123456',
      livestreamTotalLocal: 3000,
      livestreamTotalUsd: 7.5,
      videoTotalLocal: 2000,
      videoTotalUsd: 5.0,
      uniqueLivestreams: 2,
      averageMessageValue: 500,
      totalFees: 50,
      averageFee: 5,
      feePercentage: 1.0,
    },
    {
      countryCode: 'GHA',
      flag: 'flags/gh.svg',
      localCurrencyCode: 'GHS',
      hasAccount: false,
      totalLocal: 3000,
      totalUsd: 8.0,
      nextPayAmountLocal: 2700,
      nextPayAmountUsd: 7.2,
      nextPayDate: '2026-03-05',
      premiumMessages: 5,
      livestreamMessages: 2,
      videoMessages: 3,
      mobileNumber: null,
      livestreamTotalLocal: 1000,
      livestreamTotalUsd: 2.67,
      videoTotalLocal: 2000,
      videoTotalUsd: 5.33,
      uniqueLivestreams: 1,
      averageMessageValue: 600,
      totalFees: 30,
      averageFee: 6,
      feePercentage: 1.0,
    },
    {
      countryCode: 'KEN',
      flag: 'flags/ke.svg',
      localCurrencyCode: 'KES',
      hasAccount: true,
      totalLocal: 2000,
      totalUsd: 15.0,
      nextPayAmountLocal: null,
      nextPayAmountUsd: null,
      nextPayDate: null,
      premiumMessages: 8,
      livestreamMessages: 0,
      videoMessages: 8,
      mobileNumber: '+254123456',
      livestreamTotalLocal: 0,
      livestreamTotalUsd: 0,
      videoTotalLocal: 2000,
      videoTotalUsd: 15.0,
      uniqueLivestreams: 0,
      averageMessageValue: 250,
      totalFees: 20,
      averageFee: 2.5,
      feePercentage: 1.0,
    }
  ];

  beforeEach(async () => {
    mockOffcanvasInstance.show.calls.reset();
    mockOffcanvasInstance.hide.calls.reset();
    mockOffcanvasInstance.dispose.calls.reset();

    getInstanceSpy = spyOn(bootstrap.Offcanvas, 'getInstance').and.returnValue(mockOffcanvasInstance as any);
    getOrCreateSpy = spyOn(bootstrap.Offcanvas, 'getOrCreateInstance').and.returnValue(mockOffcanvasInstance as any);

    await TestBed.configureTestingModule({
      imports: [PaymentOverviewDrawerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentOverviewDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('CurrentData getter', () => {
    it('should return the item at selectedOption index when data and selectedOption are set', () => {
      component.data = mockItems;
      component.selectedOption = 1;

      expect(component.CurrentData).toEqual(mockItems[1]);
    });

    it('should return the first item when selectedOption is 0', () => {
      component.data = mockItems;
      component.selectedOption = 0;

      expect(component.CurrentData).toEqual(mockItems[0]);
    });

    it('should return the last item when selectedOption is at the last index', () => {
      component.data = mockItems;
      component.selectedOption = 2;

      expect(component.CurrentData).toEqual(mockItems[2]);
    });

    it('should return null when data is empty and selectedOption is undefined', () => {
      component.data = [];
      (component as any).selectedOption = undefined;

      expect(component.CurrentData).toBeNull();
    });

    it('should return undefined element when selectedOption is out of bounds', () => {
      component.data = mockItems;
      component.selectedOption = 10;

      expect(component.CurrentData).toBeUndefined();
    });

    it('should return null when selectedOption is undefined', () => {
      component.data = mockItems;
      (component as any).selectedOption = undefined;

      expect(component.CurrentData).toBeNull();
    });
  });

  describe('goLeft', () => {
    beforeEach(() => {
      component.data = mockItems;
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
      component.data = mockItems;
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
      component.data = [mockItems[0]];
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
    it('should call show on offcanvas instance', () => {
      component.open();
      expect(getOrCreateSpy).toHaveBeenCalled();
      expect(mockOffcanvasInstance.show).toHaveBeenCalled();
    });
  });

  describe('closeDrawer', () => {
    it('should call hide on offcanvas instance', () => {
      component.closeDrawer();
      expect(getOrCreateSpy).toHaveBeenCalled();
      expect(mockOffcanvasInstance.hide).toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('should call dispose on offcanvas instance', () => {
      component.ngOnDestroy();
      expect(getInstanceSpy).toHaveBeenCalled();
      expect(mockOffcanvasInstance.dispose).toHaveBeenCalled();
    });
  });

  describe('initial state', () => {
    it('should initialize data as an empty array', () => {
      expect(component.data).toEqual([]);
    });

    it('should initialize paymentStep as 1', () => {
      expect(component.paymentStep).toBe(1);
    });

    it('should have svgIcons defined', () => {
      expect(component.svgIcons).toBeDefined();
    });
  });
});
