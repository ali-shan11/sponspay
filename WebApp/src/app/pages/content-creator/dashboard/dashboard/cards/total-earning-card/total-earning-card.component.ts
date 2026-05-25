import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ChartData, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { SvgIcons } from '@utils/svg-icons';
import { combineLatest, distinctUntilChanged, filter, merge, Subscription } from 'rxjs';
import { GrowthComponent } from '@components/growth/growth.component';
import { NumberFormatPipe } from '@pipes/number-format.pipe';
import { RevenuePerDayResponse } from '@app-types/dashboard';
import { DashboardService } from '@services/dashboard.service';

@Component({
  selector: 'app-total-earning-card',
  imports: [BaseChartDirective, GrowthComponent, NumberFormatPipe],
  templateUrl: './total-earning-card.component.html',
  styleUrl: './total-earning-card.component.scss'
})
export class TotalEarningCardComponent implements OnInit, OnDestroy {
  public svgIcon = SvgIcons;
  public isLoading = true;
  public chartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        label: 'Total Earnings',
        data: [],
        borderColor: 'rgba(56, 99, 255, 1)',
        backgroundColor: 'rgba(56, 99, 255, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      }
    ]
  };
  public chartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: {
          display: true,
          maxRotation: 45,
          autoSkip: true,
          maxTicksLimit: 10,
        },
        title: {
          display: false
        },
        grid: {
          display: true,
          color: 'rgba(230, 230, 233, 1)',
          drawTicks: false,
        },
        border: {
          display: true,
          dash: [5,5],
          dashOffset: 0
        }
      },
      y: {
        ticks: {
          display: true,
          callback: (value) => `$${value}`,
        },
        title: {
          display: false
        },
        grid: {
          display: true,
          color: 'rgba(230, 230, 233, 1)',
          drawTicks: false
        },
        border:{
          display: true
        },
        beginAtZero: true,
      }
    }
  };
  public revenue: RevenuePerDayResponse | null = null;
  public unSubscribe: Subscription[] = []

  public dashboardService = inject(DashboardService);
  
  ngOnDestroy(): void {
    this.unSubscribe.forEach(sub => {
      sub.unsubscribe();
    });
  }
  ngOnInit(): void {
    this.subFiltersChange();
  }

  subFiltersChange(){
    const filtersChanged$ = combineLatest([
      this.dashboardService.selectedDaysObservable,
      this.dashboardService.selectedChannelObservable
    ]).pipe(
      filter(([days, channel]) => !!days && !!channel),
      distinctUntilChanged(
        ([prevDays, prevChannel], [currDays, currChannel]) =>
          prevDays === currDays && prevChannel === currChannel
      )
    );

    this.unSubscribe.push(
      merge(filtersChanged$, this.dashboardService.refresh$)
      .subscribe(() => {
        this.getRevenuePerDay();
      })
    );
  }

  get hasData(): boolean {
    if (!this.revenue) return false;
    return this.revenue.totalRevenueUsd > 0 || this.revenue.series.some(s => s.revenueUsd > 0);
  }

  get lastDaysText(){
    return `${this.dashboardService.selectedDaysObservable.value} Days`
  }

  getRevenuePerDay(){
    this.revenue = null;
    this.isLoading = true;
    this.dashboardService.getRevenuePerDay().subscribe({
      next: (res:RevenuePerDayResponse) => {
        this.revenue = res;
        this.isLoading = false;
        this.mapChartData();
      },
      error: ()=>{
        this.isLoading = false;
      },
    })
  }

  mapChartData(){
    if (this.revenue && this.revenue.series.length>0) {
      const labelArr: string[] = [];
      const dataArr: number[] = [];
      this.revenue.series.map((series)=>{
        labelArr.push(this.getFormattedDate(series.date));
        dataArr.push(series.revenueUsd);
      });
      this.chartData.labels = labelArr;
      this.chartData.datasets[0].data = dataArr;
    }
  }

  getFormattedDate(stringDate: string) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const [, m, d] = stringDate.split('-');
    return `${parseInt(d)} ${months[parseInt(m) - 1]}`;
  }


}
