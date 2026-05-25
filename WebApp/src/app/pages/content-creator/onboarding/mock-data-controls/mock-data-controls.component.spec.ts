import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MockDataControlsComponent } from './mock-data-controls.component';

describe('MockDataControlsComponent', () => {
  let component: MockDataControlsComponent;
  let fixture: ComponentFixture<MockDataControlsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MockDataControlsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MockDataControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize mockSubscribers and mockViewers from inputs', () => {
      component.initialSubscribers = 1000;
      component.initialViewers = 500;
      component.ngOnInit();
      expect(component.mockSubscribers).toBe(1000);
      expect(component.mockViewers).toBe(500);
    });

    it('should cap viewers to subscribers if viewers exceed subscribers on init', () => {
      component.initialSubscribers = 200;
      component.initialViewers = 500;
      component.ngOnInit();
      expect(component.mockViewers).toBe(200);
    });

    it('should leave viewers unchanged if they do not exceed subscribers', () => {
      component.initialSubscribers = 800;
      component.initialViewers = 100;
      component.ngOnInit();
      expect(component.mockViewers).toBe(100);
    });
  });

  describe('ngOnChanges', () => {
    it('should update mockSubscribers and mockViewers when inputs change', () => {
      component.initialSubscribers = 1200;
      component.initialViewers = 600;
      component.ngOnChanges();
      expect(component.mockSubscribers).toBe(1200);
      expect(component.mockViewers).toBe(600);
    });

    it('should cap viewers to subscribers on changes if viewers exceed subscribers', () => {
      component.initialSubscribers = 300;
      component.initialViewers = 700;
      component.ngOnChanges();
      expect(component.mockViewers).toBe(300);
    });
  });

  describe('onMockDataToggle', () => {
    it('should emit mockDataToggled with true when useMockData is true', () => {
      spyOn(component.mockDataToggled, 'emit');
      component.useMockData = true;
      component.initialSubscribers = 800;
      component.initialViewers = 320;
      component.onMockDataToggle();
      expect(component.mockDataToggled.emit).toHaveBeenCalledWith(true);
    });

    it('should emit mockDataToggled with false when useMockData is false', () => {
      spyOn(component.mockDataToggled, 'emit');
      component.useMockData = false;
      component.onMockDataToggle();
      expect(component.mockDataToggled.emit).toHaveBeenCalledWith(false);
    });

    it('should reinitialize mock values from inputs when toggling on', () => {
      component.useMockData = true;
      component.initialSubscribers = 500;
      component.initialViewers = 200;
      component.onMockDataToggle();
      expect(component.mockSubscribers).toBe(500);
      expect(component.mockViewers).toBe(200);
    });

    it('should use 320 as default viewers when initialViewers is 0 and toggling on', () => {
      component.useMockData = true;
      component.initialSubscribers = 500;
      component.initialViewers = 0;
      component.onMockDataToggle();
      expect(component.mockViewers).toBe(320);
    });

    it('should cap viewers to subscribers when toggling on if viewers exceed subscribers', () => {
      component.useMockData = true;
      component.initialSubscribers = 100;
      component.initialViewers = 500;
      component.onMockDataToggle();
      expect(component.mockViewers).toBe(100);
    });

    it('should not reinitialize mock values when toggling off', () => {
      component.mockSubscribers = 999;
      component.mockViewers = 111;
      component.useMockData = false;
      component.onMockDataToggle();
      // Values should remain untouched since useMockData is false
      expect(component.mockSubscribers).toBe(999);
      expect(component.mockViewers).toBe(111);
    });
  });

  describe('onSliderChange', () => {
    it('should emit mockDataChanged with current subscribers and viewers', () => {
      spyOn(component.mockDataChanged, 'emit');
      component.mockSubscribers = 1000;
      component.mockViewers = 400;
      component.onSliderChange();
      expect(component.mockDataChanged.emit).toHaveBeenCalledWith({
        subscribers: 1000,
        viewers: 400,
      });
    });

    it('should cap viewers to subscribers before emitting if viewers exceed subscribers', () => {
      spyOn(component.mockDataChanged, 'emit');
      component.mockSubscribers = 300;
      component.mockViewers = 500;
      component.onSliderChange();
      expect(component.mockViewers).toBe(300);
      expect(component.mockDataChanged.emit).toHaveBeenCalledWith({
        subscribers: 300,
        viewers: 300,
      });
    });

    it('should not modify viewers if they are within the valid range', () => {
      spyOn(component.mockDataChanged, 'emit');
      component.mockSubscribers = 1000;
      component.mockViewers = 500;
      component.onSliderChange();
      expect(component.mockViewers).toBe(500);
    });
  });

  describe('onSubscriberChange', () => {
    it('should cap viewers when subscribers drop below current viewers', () => {
      spyOn(component.mockDataChanged, 'emit');
      component.mockViewers = 800;
      component.mockSubscribers = 500;
      component.onSubscriberChange();
      expect(component.mockViewers).toBe(500);
      expect(component.mockDataChanged.emit).toHaveBeenCalledWith({
        subscribers: 500,
        viewers: 500,
      });
    });

    it('should not cap viewers when subscribers are above current viewers', () => {
      spyOn(component.mockDataChanged, 'emit');
      component.mockViewers = 300;
      component.mockSubscribers = 1000;
      component.onSubscriberChange();
      expect(component.mockViewers).toBe(300);
      expect(component.mockDataChanged.emit).toHaveBeenCalledWith({
        subscribers: 1000,
        viewers: 300,
      });
    });

    it('should call onSliderChange internally to emit changes', () => {
      spyOn(component, 'onSliderChange');
      component.mockSubscribers = 500;
      component.mockViewers = 300;
      component.onSubscriberChange();
      expect(component.onSliderChange).toHaveBeenCalled();
    });
  });

  describe('getVariationDisplayText', () => {
    it('should return "Qualified with viewers" for qualified-with-viewers', () => {
      component.currentVariation = 'qualified-with-viewers';
      expect(component.getVariationDisplayText()).toBe('Qualified with viewers');
    });

    it('should return "Qualified without viewers" for qualified-no-viewers', () => {
      component.currentVariation = 'qualified-no-viewers';
      expect(component.getVariationDisplayText()).toBe('Qualified without viewers');
    });

    it('should return "Not qualified (<250 subscribers)" for not-qualified', () => {
      component.currentVariation = 'not-qualified';
      expect(component.getVariationDisplayText()).toBe('Not qualified (<250 subscribers)');
    });

    it('should return default text for unknown variation', () => {
      component.currentVariation = 'some-unknown-value';
      expect(component.getVariationDisplayText()).toBe('Payment access details with mock data');
    });

    it('should return default text for empty string variation', () => {
      component.currentVariation = '';
      expect(component.getVariationDisplayText()).toBe('Payment access details with mock data');
    });
  });

  describe('input defaults', () => {
    it('should have default values for all inputs', () => {
      const fresh = new MockDataControlsComponent();
      expect(fresh.useMockData).toBeFalse();
      expect(fresh.isProduction).toBeTrue();
      expect(fresh.initialSubscribers).toBe(800);
      expect(fresh.initialViewers).toBe(250);
      expect(fresh.showVariationIndicator).toBeFalse();
      expect(fresh.currentVariation).toBe('');
    });
  });
});
