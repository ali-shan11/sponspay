import { SvgMenuIcon } from '@utils/svg-icons';
import { Component, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { SvgIcons } from '@utils/svg-icons';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { InlineSvgComponent } from '@components/inline-svg/inline-svg.component';
import { AuthService } from '@services/auth.service';
import { TokenService } from '@services/token.service';
import { MENU_LIST } from '@utils/menu';
import { UserData } from '@app-types/components';
import { filter, map } from 'rxjs/operators';
import { CurrentYoutubeChannelSelectionComponent } from "@components/current-youtube-channel-selection/current-youtube-channel-selection.component";
import { ButtonComponent } from "@components/button/button.component";
import { Subscription } from 'rxjs';
import { DashboardService } from '@services/dashboard.service';
import { ChannelStatisticsResponse } from '@app-types/dashboard';

@Component({
  selector: 'app-dashboard-header',
  imports: [RouterModule, InlineSvgComponent, CommonModule, RouterLink, CurrentYoutubeChannelSelectionComponent, ButtonComponent],
  templateUrl: './dashboard-header.component.html',
  styleUrl: './dashboard-header.component.scss'
})
export class DashboardHeaderComponent implements OnInit, OnDestroy {
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (event && event.target) {
      const clickedInside = (event.target as HTMLElement).closest('.user-menu-dropdown');
      const userInfoClicked = (event.target as HTMLElement).closest('.user-img');
      if (!clickedInside || !userInfoClicked) {
        this.isDropdownOpen=false;
      }
    }
  }
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private tokenService = inject(TokenService);
  private authService = inject(AuthService);
  public dashboardService = inject(DashboardService);

  public isDropdownOpen = false;
  public svgIcon = SvgIcons;
  public menuList = MENU_LIST;
  public menuIcons = SvgMenuIcon;
  public mobileMenuOpen = false;
  public pageTitle = '';
  public isLoading = false;
  public isTextCopied = false;
  public user: UserData | null = this.tokenService.getCurrentUserObj();
  public unSubscribe: Subscription[] = [];
  public domainUrl = window.location.origin;
  public channelStats: ChannelStatisticsResponse | null = null;

  ngOnDestroy(): void {
    this.unSubscribe.forEach(sub => {
      sub.unsubscribe();
    });
  }

  ngOnInit(): void {
    this.pageTitle = this.getPageTitle(this.route);
    this.subRouterEvents();
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

  subRouterEvents(){
    this.router.events
    .pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.getPageTitle(this.route) )
    )
    .subscribe(title => this.pageTitle = title);
  }

  private getPageTitle(route: ActivatedRoute): string {
    let child = route.firstChild;

    while (child?.firstChild) {
      child = child.firstChild;
    }

    return child?.snapshot.data['title'] || '';
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  toggleDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  handleSignout(){
    this.authService.signOut();
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
}
