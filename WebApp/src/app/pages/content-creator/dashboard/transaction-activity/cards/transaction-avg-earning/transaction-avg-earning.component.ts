import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { MessageUnitStatistics } from '@app-types/transaction-activity';
import { GrowthComponent } from '@components/growth/growth.component';
import { NumberFormatPipe } from '@pipes/number-format.pipe';
import { SvgIcons } from '@utils/svg-icons';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-transaction-avg-earning',
  imports: [BaseChartDirective, GrowthComponent, NumberFormatPipe],
  templateUrl: './transaction-avg-earning.component.html',
  styleUrl: './transaction-avg-earning.component.scss'
})
export class TransactionAvgEarningComponent implements OnChanges{
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  @Input({required: true}) isLoading!: boolean;
  @Input({required: true}) messageStats!: MessageUnitStatistics | null;
  public svgIcon = SvgIcons;
  private _monthsForTooltip: string[] = [];

  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['', '', '', '', '', '', ''],
    datasets: [
      {
        data: [10, 45, 20, 60, 50, 75, 40],
        backgroundColor: [
          '#C7D2FF',
          '#3D5AFE',
          '#C7D2FF',
          '#3D5AFE',
          '#C7D2FF',
          '#3D5AFE',
          '#C7D2FF'
        ],
        borderSkipped: false,
        borderRadius: {
          topLeft: 3,
          topRight: 3,
          bottomLeft: 3,
          bottomRight: 3
        },
        barPercentage: 0.7,
        categoryPercentage: 0.8
      }
    ]
  };
  public barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      // tooltip: { enabled: false }
      tooltip: {
        enabled: true,
        callbacks: {
          title: (tooltipItems) => {
            const index = tooltipItems[0].dataIndex;
            return this._monthsForTooltip[index];
          },
          label: (context) => {
            return `Average per day: $${context.raw}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: false,
        grid: { display: false }
      },
      y: {
        display: false,
        grid: { display: false }
      }
    }
  };

  get hasData(): boolean {
    if (!this.messageStats?.current30Days) return false;
    return this.messageStats.current30Days.averageUsd > 0 || this.messageStats.monthlyAverages?.some(m => m.averagePerDayUsd > 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes && changes['messageStats']?.currentValue) {
      this.mapChartData();
    }
  }

  mapChartData(){
    if (!this.messageStats?.monthlyAverages?.length) return;

    const months = this.messageStats.monthlyAverages.map(m => m.month);
    const values = this.messageStats.monthlyAverages.map(m => m.averagePerDayUsd);

    this.barChartData = {
      labels: months.map(() => ''),
      datasets: [
        {
          data: values,
          backgroundColor: values.map((_, i) =>
            i % 2 === 0 ? '#C7D2FF' : '#3D5AFE'
          ),
          borderSkipped: false,
          borderRadius: 3,
          barPercentage: 0.7,
          categoryPercentage: 0.8
        }
      ]
    };

    this._monthsForTooltip = months;

    this.chart?.update();
  }

}
