import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { SvgCountryFlags } from '@utils/svg-icons';
import { CommonModule } from '@angular/common';
import { combineLatest, distinctUntilChanged, filter, merge, Subscription } from 'rxjs';
import { TopEarningCountriesResponse } from '@app-types/dashboard';
import { DashboardService } from '@services/dashboard.service';
import { GetFlagUrl } from '@utils/constants';

@Component({
  selector: 'app-top-earning-card',
  imports: [CommonModule],
  templateUrl: './top-earning-card.component.html',
  styleUrl: './top-earning-card.component.scss'
})
export class TopEarningCardComponent implements OnInit, OnDestroy {
  public countryIcon = SvgCountryFlags;
  public topEarningCountries: TopEarningCountriesResponse | null = null;
  public isLoading = true;  
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
        this.getTopEarningCountriesData();
      })
    );
  }

  getTopEarningCountriesData(){
    this.topEarningCountries = null;
    this.isLoading = true;
    this.dashboardService.getTopEarningCountries().subscribe({
      next: (res:TopEarningCountriesResponse) => {
        this.topEarningCountries = res;
        this.topEarningCountries.items.map((country)=>{
          country.flag = GetFlagUrl(country.countryCode);
        });
        this.isLoading = false;
      },
      error: ()=>{
        this.isLoading = false;
      },
    })
  }
}
