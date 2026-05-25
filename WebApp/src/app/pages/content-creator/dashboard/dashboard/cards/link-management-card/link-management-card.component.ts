
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { combineLatest, distinctUntilChanged, filter, merge, Subscription } from 'rxjs';
import { ButtonComponent } from '@components/button/button.component';
import { InlineSvgComponent } from '@components/inline-svg/inline-svg.component';
import { GrowthComponent } from '@components/growth/growth.component';
import { SvgIcons } from '@utils/svg-icons';
import { ChannelStatisticsResponse } from '@app-types/dashboard';
import { DashboardService } from '@services/dashboard.service';

@Component({
  selector: 'app-link-management-card',
  imports: [ButtonComponent, InlineSvgComponent, GrowthComponent, NgClass],
  templateUrl: './link-management-card.component.html',
  styleUrl: './link-management-card.component.scss'
})
export class LinkManagementCardComponent implements OnInit, OnDestroy {
  public svgIcon = SvgIcons;
  public channelStats: ChannelStatisticsResponse | null = null;
  public isLoading = true;
  public isTextCopied = false;
  public unSubscribe: Subscription[] = [];
  public domainUrl = window.location.origin;

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
        this.getChannelStats();
      })
    );
  }

  get hasLinkActivity(): boolean {
    if (!this.channelStats) return false;
    return this.channelStats.transactions > 0 || this.channelStats.linkClicks > 0;
  }

  get lastDaysText(){
    return `${this.dashboardService.selectedDaysObservable.value} days`
  }

  getChannelStats(){
    this.isLoading = true;
    this.dashboardService.getChannelStatistics().subscribe({
      next: (res:ChannelStatisticsResponse) => {
        this.channelStats = res;
        this.isLoading = false;
      },
      error: ()=>{
        this.isLoading = false;
      },
    })
  }

  get url(){
    return this.domainUrl+`/fan/${this.channelStats?.channelHandle || ''}`;
  }

  copyToClipboard(){
    navigator.clipboard.writeText(this.url).then(() => {
      this.isTextCopied = true;
      setTimeout(() => {
        this.isTextCopied = false;
      }, 2000);
    });
  }

  openInNewTab(){
    window.open(this.url, '_blank');
  }
}
