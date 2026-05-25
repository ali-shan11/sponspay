import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange, SimpleChanges } from '@angular/core';
import { TransactionAvgEarningComponent } from './transaction-avg-earning.component';
import { MessageUnitStatistics } from '@app-types/transaction-activity';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

describe('TransactionAvgEarningComponent', () => {
  let component: TransactionAvgEarningComponent;
  let fixture: ComponentFixture<TransactionAvgEarningComponent>;

  const mockMessageStats: MessageUnitStatistics = {
    current30Days: { totalUsd: 500, averageUsd: 16.67, transactionCount: 30 },
    previous30Days: { totalUsd: 400, averageUsd: 13.33, transactionCount: 25 },
    changePercentage: 25,
    monthlyAverages: [
      { month: 'Jan', averagePerDayUsd: 10 },
      { month: 'Feb', averagePerDayUsd: 20 },
      { month: 'Mar', averagePerDayUsd: 15 },
      { month: 'Apr', averagePerDayUsd: 30 },
      { month: 'May', averagePerDayUsd: 25 },
      { month: 'Jun', averagePerDayUsd: 35 },
      { month: 'Jul', averagePerDayUsd: 40 },
    ],
    topCountries: [{ countryCode: 'KE', countryName: 'Kenya', totalUsd: 100 }],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionAvgEarningComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionAvgEarningComponent);
    component = fixture.componentInstance;
    component.isLoading = false;
    component.messageStats = null;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default bar chart data with 7 empty labels', () => {
    expect(component.barChartData.labels).toEqual(['', '', '', '', '', '', '']);
    expect(component.barChartData.datasets.length).toBe(1);
    expect(component.barChartData.datasets[0].data).toEqual([10, 45, 20, 60, 50, 75, 40]);
  });

  it('should have bar chart options with responsive and no legend', () => {
    expect(component.barChartOptions).toBeDefined();
    expect(component.barChartOptions!.responsive).toBe(true);
    expect(component.barChartOptions!.maintainAspectRatio).toBe(false);
    expect(component.barChartOptions!.plugins!.legend!.display).toBe(false);
  });

  describe('ngOnChanges', () => {
    it('should call mapChartData when messageStats changes with a current value', () => {
      spyOn(component, 'mapChartData');
      const changes: SimpleChanges = {
        messageStats: new SimpleChange(null, mockMessageStats, true),
      };
      component.messageStats = mockMessageStats;
      component.ngOnChanges(changes);
      expect(component.mapChartData).toHaveBeenCalled();
    });

    it('should not call mapChartData when changes is null-ish', () => {
      spyOn(component, 'mapChartData');
      component.ngOnChanges(null as unknown as SimpleChanges);
      expect(component.mapChartData).not.toHaveBeenCalled();
    });

    it('should not call mapChartData when messageStats change has no currentValue', () => {
      spyOn(component, 'mapChartData');
      const changes: SimpleChanges = {
        messageStats: new SimpleChange(mockMessageStats, null, false),
      };
      component.ngOnChanges(changes);
      expect(component.mapChartData).not.toHaveBeenCalled();
    });

    it('should not call mapChartData when a different input changes', () => {
      spyOn(component, 'mapChartData');
      const changes: SimpleChanges = {
        isLoading: new SimpleChange(true, false, false),
      };
      component.ngOnChanges(changes);
      expect(component.mapChartData).not.toHaveBeenCalled();
    });
  });

  describe('mapChartData', () => {
    it('should return early if messageStats is null', () => {
      component.messageStats = null;
      const originalData = component.barChartData;
      component.mapChartData();
      expect(component.barChartData).toBe(originalData);
    });

    it('should return early if monthlyAverages is undefined', () => {
      component.messageStats = {
        ...mockMessageStats,
        monthlyAverages: undefined as any,
      };
      const originalData = component.barChartData;
      component.mapChartData();
      expect(component.barChartData).toBe(originalData);
    });

    it('should return early if monthlyAverages is an empty array', () => {
      component.messageStats = {
        ...mockMessageStats,
        monthlyAverages: [],
      };
      const originalData = component.barChartData;
      component.mapChartData();
      expect(component.barChartData).toBe(originalData);
    });

    it('should map monthlyAverages into barChartData labels and values', () => {
      component.messageStats = mockMessageStats;
      component.mapChartData();

      // Labels should be empty strings (same count as months)
      expect(component.barChartData.labels!.length).toBe(7);
      expect(component.barChartData.labels!.every(l => l === '')).toBe(true);

      // Data values should match averagePerDayUsd values
      const expectedValues = [10, 20, 15, 30, 25, 35, 40];
      expect(component.barChartData.datasets[0].data).toEqual(expectedValues);
    });

    it('should alternate background colors for bars', () => {
      component.messageStats = mockMessageStats;
      component.mapChartData();

      const colors = component.barChartData.datasets[0].backgroundColor as string[];
      expect(colors[0]).toBe('#C7D2FF'); // even index
      expect(colors[1]).toBe('#3D5AFE'); // odd index
      expect(colors[2]).toBe('#C7D2FF'); // even index
      expect(colors[3]).toBe('#3D5AFE'); // odd index
    });

    it('should set borderSkipped to false', () => {
      component.messageStats = mockMessageStats;
      component.mapChartData();
      expect(component.barChartData.datasets[0].borderSkipped).toBe(false);
    });

    it('should set borderRadius to 3', () => {
      component.messageStats = mockMessageStats;
      component.mapChartData();
      expect(component.barChartData.datasets[0].borderRadius).toBe(3);
    });

    it('should set barPercentage and categoryPercentage', () => {
      component.messageStats = mockMessageStats;
      component.mapChartData();
      expect(component.barChartData.datasets[0].barPercentage).toBe(0.7);
      expect(component.barChartData.datasets[0].categoryPercentage).toBe(0.8);
    });

    it('should store month names for tooltip access', () => {
      component.messageStats = mockMessageStats;
      component.mapChartData();
      expect((component as any)._monthsForTooltip).toEqual([
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'
      ]);
    });

    it('should call chart.update() if chart ViewChild exists', () => {
      component.messageStats = mockMessageStats;
      const mockChart = { update: jasmine.createSpy('update') };
      (component as any).chart = mockChart;
      component.mapChartData();
      expect(mockChart.update).toHaveBeenCalled();
    });

    it('should not throw if chart ViewChild is undefined', () => {
      component.messageStats = mockMessageStats;
      (component as any).chart = undefined;
      expect(() => component.mapChartData()).not.toThrow();
    });

    it('should handle a single monthly average entry', () => {
      component.messageStats = {
        ...mockMessageStats,
        monthlyAverages: [{ month: 'Dec', averagePerDayUsd: 50 }],
      };
      component.mapChartData();
      expect(component.barChartData.labels!.length).toBe(1);
      expect(component.barChartData.datasets[0].data).toEqual([50]);
      const colors = component.barChartData.datasets[0].backgroundColor as string[];
      expect(colors[0]).toBe('#C7D2FF');
    });
  });

  describe('tooltip callbacks', () => {
    it('should return month name from _monthsForTooltip for tooltip title', () => {
      component.messageStats = mockMessageStats;
      component.mapChartData();

      const tooltipCallbacks = component.barChartOptions!.plugins!.tooltip!.callbacks!;
      const titleFn = tooltipCallbacks.title as (items: any[]) => string;
      const result = titleFn([{ dataIndex: 2 }]);
      expect(result).toBe('Mar');
    });

    it('should return formatted label for tooltip label callback', () => {
      const tooltipCallbacks = component.barChartOptions!.plugins!.tooltip!.callbacks!;
      const labelFn = tooltipCallbacks.label as (context: any) => string;
      const result = labelFn({ raw: 42 });
      expect(result).toBe('Average per day: $42');
    });
  });

  describe('chart options scales', () => {
    it('should have x axis display set to false', () => {
      const scales = component.barChartOptions!.scales!;
      expect((scales as any).x.display).toBe(false);
      expect((scales as any).x.grid.display).toBe(false);
    });

    it('should have y axis display set to false', () => {
      const scales = component.barChartOptions!.scales!;
      expect((scales as any).y.display).toBe(false);
      expect((scales as any).y.grid.display).toBe(false);
    });
  });
});
