import { SvgIcons, SvgMenuIcon } from '@utils/svg-icons';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { InlineSvgComponent } from '@components/inline-svg/inline-svg.component';
import { AuthService } from '@services/auth.service';
import { MENU_LIST } from '@utils/menu';
import { ChannelStatisticsResponse } from '@app-types/dashboard';
import { Subscription } from 'rxjs';
import { DashboardService } from '@services/dashboard.service';
import { ButtonComponent } from "@components/button/button.component";

@Component({
  selector: 'app-dashboard-sidebar',
  imports: [InlineSvgComponent, RouterModule, ButtonComponent],
  templateUrl: './dashboard-sidebar.component.html',
  styleUrl: './dashboard-sidebar.component.scss'
})
export class DashboardSidebarComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  public authService = inject(AuthService);
  public dashboardService = inject(DashboardService);
  public channelStats: ChannelStatisticsResponse | null = null;
  public isLoading = true;
  public isTextCopied = false;
  public unSubscribe: Subscription[] = [];
  public domainUrl = window.location.origin;
  
  svgIcons= SvgIcons;
  menuIcons = SvgMenuIcon;
  menuList = MENU_LIST;

  ngOnDestroy(): void {
    this.unSubscribe.forEach(sub => {
      sub.unsubscribe();
    });
  }

  ngOnInit(): void {
    this.subYtChannelChange();
  }

  subYtChannelChange(){
    this.unSubscribe.push(
      this.dashboardService.selectedChannelObservable.subscribe((channelId:string | null)=>{
        if (channelId) {
          this.getChannelStats();
        }
      })
    );
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
    });

    setTimeout(() => {
      this.isTextCopied = false;
    }, 2000);
  }


  handleSignout(){
    this.authService.signOut();
  }

  gotoHomePage(){
    this.router.navigateByUrl('/')
  }
}
