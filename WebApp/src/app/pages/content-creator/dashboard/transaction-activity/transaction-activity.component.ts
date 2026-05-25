import { Component, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { UserData } from '@app-types/components';
import { CreatorSignInResponse } from '@app-types/onboarding';
import { AuthService } from '@services/auth.service';
import { DashboardService } from '@services/dashboard.service';
import { TokenService } from '@services/token.service';
import { LatestTransactionComponent } from "./latest-transaction/latest-transaction.component";
import { TransactionTotalEarningComponent } from "./cards/transaction-total-earning/transaction-total-earning.component";
import { TransactionAvgEarningComponent } from "./cards/transaction-avg-earning/transaction-avg-earning.component";
import { TransactionTopEarningCountryComponent } from "./cards/transaction-top-earning-country/transaction-top-earning-country.component";
import { Subscription } from 'rxjs';
import { MessageUnitStatistics } from '@app-types/transaction-activity';
import { LatestTransactionService } from '@services/latest-transaction.service';
import { GetFlagUrl } from '@utils/constants';

@Component({
  selector: 'app-transaction-activity',
  imports: [ LatestTransactionComponent, TransactionTotalEarningComponent, TransactionAvgEarningComponent, TransactionTopEarningCountryComponent],
  templateUrl: './transaction-activity.component.html',
  styleUrl: './transaction-activity.component.scss'
})
export class TransactionActivityComponent implements OnInit, OnDestroy {
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (event && event.target) {
      this.isDaysDropdownOpen=false;
    }
  }
  private tokenService = inject(TokenService);
  private authService = inject(AuthService);
  public dashboardService = inject(DashboardService);
  public transactionService = inject(LatestTransactionService);
  
  public unSubscribe: Subscription[] = []
  public user: UserData | null = this.tokenService.getCurrentUserObj();
  public currentDate = new Date();
  public isDaysDropdownOpen = false;
  public signInResponse: CreatorSignInResponse | null = null;
  public daysOptions = [
    { text: 'Today', value: 1 },
    { text: 'This Week', value: 7 },
    { text: 'Last 30 Days', value: 30 },
    { text: 'Last Quarter', value: 90 },
    { text: 'Last 6 Months', value: 180 },
    { text: 'This Year', value: 365 }
  ];
  public messageStatistics: MessageUnitStatistics | null = null;
  public isMessageStatLoading = true;

  ngOnInit(): void {
    this.subYtChannelChange();
    this.subSignInResponse();
  }

  ngOnDestroy(): void {
    this.unSubscribe.forEach(sub => {
      sub.unsubscribe();
    });
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

  subYtChannelChange(){
    this.unSubscribe.push(
      this.dashboardService.selectedChannelObservable.subscribe((channelId:string | null)=>{
        if (channelId) {
          this.getMessageStats();
        }
      })
    );
  }

  get isTelegramConnected(){
    return this.signInResponse && this.signInResponse.isCreator && this.signInResponse.isCoAdmin;
  }

  getMessageStats(){
    this.isMessageStatLoading = true;
    this.unSubscribe.push(
      this.transactionService.getMessageStats().subscribe({
        next: (res:MessageUnitStatistics) => {
          this.messageStatistics = res;
          this.isMessageStatLoading = false;
          if (this.messageStatistics?.topCountries) {
            for (const country of this.messageStatistics.topCountries) {
              country.flag = GetFlagUrl(country.countryCode);
            }
          }
        },
        error: ()=>{
          this.isMessageStatLoading = false;
        },
      })
    );
  }
}
