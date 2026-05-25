import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GrowthComponent } from './growth.component';

describe('GrowthComponent', () => {
  let component: GrowthComponent;
  let fixture: ComponentFixture<GrowthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GrowthComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GrowthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default input values', () => {
    expect(component.value).toBeNull();
    expect(component.isLoading).toBe(true);
  });

  it('should have svgIcon defined', () => {
    expect(component.svgIcon).toBeTruthy();
  });

  describe('trendFlow', () => {
    it('should return "up" when value is positive', () => {
      component.value = 10;
      expect(component.trendFlow).toBe('up');
    });

    it('should return "down" when value is negative', () => {
      component.value = -5;
      expect(component.trendFlow).toBe('down');
    });

    it('should return "neutral" when value is 0', () => {
      component.value = 0;
      expect(component.trendFlow).toBe('neutral');
    });

    it('should return "neutral" when value is null', () => {
      component.value = null;
      expect(component.trendFlow).toBe('neutral');
    });

    it('should return "neutral" when value is undefined', () => {
      component.value = undefined;
      expect(component.trendFlow).toBe('neutral');
    });
  });

  describe('parsedValue', () => {
    it('should return absolute value for positive number', () => {
      component.value = 15;
      expect(component.parsedValue).toBe(15);
    });

    it('should return absolute value for negative number', () => {
      component.value = -20;
      expect(component.parsedValue).toBe(20);
    });

    it('should return 0 when value is 0', () => {
      component.value = 0;
      expect(component.parsedValue).toBe(0);
    });

    it('should return 0 when value is null', () => {
      component.value = null;
      expect(component.parsedValue).toBe(0);
    });

    it('should return 0 when value is undefined', () => {
      component.value = undefined;
      expect(component.parsedValue).toBe(0);
    });
  });

  it('should accept isLoading input', () => {
    component.isLoading = false;
    fixture.detectChanges();
    expect(component.isLoading).toBe(false);
  });

  it('should accept value input', () => {
    component.value = 42;
    fixture.detectChanges();
    expect(component.value).toBe(42);
  });
});
