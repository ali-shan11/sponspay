import { Component, HostListener, inject, OnInit } from '@angular/core';
import { PaymentOverviewComponent } from './payment-overview/payment-overview.component';
import { TotalEarningCardComponent } from "./cards/total-earning-card/total-earning-card.component";
import { TopEarningCardComponent } from "./cards/top-earning-card/top-earning-card.component";
import { LinkManagementCardComponent } from "./cards/link-management-card/link-management-card.component";
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { TokenService } from '@services/token.service';
import { UserData } from '@app-types/components';
import { DashboardService } from '@services/dashboard.service';
import { AuthService } from '@services/auth.service';
import { CreatorSignInResponse } from '@app-types/onboarding';

@Component({
  selector: 'app-dashboard',
  imports: [PaymentOverviewComponent, TotalEarningCardComponent, TopEarningCardComponent, LinkManagementCardComponent, NgTemplateOutlet, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (event && event.target) {
      this.isDaysDropdownOpen=false;
      this.isChannelDropdownOpen=false;
    }
  }
  private tokenService = inject(TokenService);
  private authService = inject(AuthService);
  public dashboardService = inject(DashboardService);
  
  public user: UserData | null = this.tokenService.getCurrentUserObj();
  public currentDate = new Date();
  public isDaysDropdownOpen = false;
  public isChannelDropdownOpen = false;
  public signInResponse: CreatorSignInResponse | null = null;
  public daysOptions = [
    { text: 'Today', value: 1 },
    { text: 'This Week', value: 7 },
    { text: 'Last 30 Days', value: 30 },
    { text: 'Last Quarter', value: 90 },
    { text: 'Last 6 Months', value: 180 },
    { text: 'This Year', value: 365 }
  ];

  ngOnInit(): void {
    this.subSignInResponse();
  }

  get selectedDaysOption(){
    const selectedDay = this.daysOptions.find((d)=> d.value === this.dashboardService.selectedDaysObservable.value);
    return selectedDay;
  }

  toggleDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.isDaysDropdownOpen = !this.isDaysDropdownOpen;
  }

  onDayOptionClick(days: number){
    this.isDaysDropdownOpen = !this.isDaysDropdownOpen;
    this.dashboardService.selectedDaysObservable.next(days);
  }

  subSignInResponse(){
    this.authService.creatorSignInResponse$.subscribe((res:CreatorSignInResponse | null)=>{
      this.signInResponse = res;
    })
  }

  refreshDashboard() {
    this.dashboardService.triggerRefresh();
  }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }

  get isTelegramConnected(){
    return this.signInResponse && this.signInResponse.isCreator && this.signInResponse.isCoAdmin;
  }
}
