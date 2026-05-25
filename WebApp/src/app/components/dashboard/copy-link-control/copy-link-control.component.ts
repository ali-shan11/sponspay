import { Component, inject, OnDestroy, OnInit } from '@angular/core';

import { animate, style, transition, trigger } from '@angular/animations';
import { Subscription } from 'rxjs';
import { DashboardService } from '@services/dashboard.service';
import { ChannelStatisticsResponse } from '@app-types/dashboard';

@Component({
  selector: 'app-copy-link-control',
  imports: [],
  templateUrl: './copy-link-control.component.html',
  styleUrl: './copy-link-control.component.scss',
  animations: [
    trigger('fadeSlideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('400ms 500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class CopyLinkControlComponent implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private subscriptions: Subscription[] = [];
  private domainUrl = window.location.origin;

  public channelStats: ChannelStatisticsResponse | null = null;
  public isLoading = true;
  public isTextCopied = false;
  public hasInteracted = false;

  ngOnInit(): void {
    this.subscriptions.push(
      this.dashboardService.selectedChannelObservable.subscribe((channelId: string | null) => {
        if (channelId) {
          this.getChannelStats();
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  get url(): string {
    return this.domainUrl + `/fan/${this.channelStats?.channelHandle || ''}`;
  }

  copyToClipboard(): void {
    this.hasInteracted = true;
    navigator.clipboard.writeText(this.url).then(() => {
      this.isTextCopied = true;
    });
    setTimeout(() => {
      this.isTextCopied = false;
    }, 2000);
  }

  private getChannelStats(): void {
    this.isLoading = true;
    this.dashboardService.getChannelStatistics().subscribe({
      next: (res: ChannelStatisticsResponse) => {
        this.channelStats = res;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }
}
