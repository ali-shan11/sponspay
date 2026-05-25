import { SvgIcons } from '@utils/svg-icons';
import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { SvgCountryFlags } from '@utils/svg-icons';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentOverviewDrawerComponent } from '../payment-overview-drawer/payment-overview-drawer.component';
import { combineLatest, filter, distinctUntilChanged, Subscription } from 'rxjs';
import { PaymentOverviewItem, PaymentOverviewResponse } from '@app-types/dashboard';
import { DashboardService } from '@services/dashboard.service';
import { InlineSvgComponent } from '@components/inline-svg/inline-svg.component';
import { GetFlagUrl } from '@utils/constants';
import { ISO_3166_1_CODES } from '@utils/phone-countrycode';
import { getAlpha2Code } from '@utils/countrycodes';

@Component({
  selector: 'app-payment-overview',
  imports: [CommonModule, FormsModule, InlineSvgComponent, PaymentOverviewDrawerComponent],
  templateUrl: './payment-overview.component.html',
  styleUrl: './payment-overview.component.scss'
})
export class PaymentOverviewComponent implements OnInit, OnDestroy {
  @ViewChild(PaymentOverviewDrawerComponent) drawer!: PaymentOverviewDrawerComponent;
  countryIcon = SvgCountryFlags;
  svgIcon = SvgIcons;
  public isLoading = false;
  public paymentData!: PaymentOverviewResponse;
  public filteredItems: PaymentOverviewItem[] = [];
  public searchTerm = '';
  public unSubscribe: Subscription[] = []

  public dashboardService = inject(DashboardService);

  ngOnDestroy(): void {
    this.unSubscribe.forEach(sub => {
      sub.unsubscribe();
    });
  }

  ngOnInit(): void {
    this.subDaysChange();
  }

  subDaysChange(){
    this.unSubscribe.push(
      combineLatest([
        this.dashboardService.selectedDaysObservable,
        this.dashboardService.selectedChannelObservable,
      ]).pipe(
        filter(([days, channel]) => !!days && !!channel),
        distinctUntilChanged(
          ([prevDays, prevChannel], [currDays, currChannel]) =>
            prevDays === currDays && prevChannel === currChannel,
        ),
      ).subscribe(() => {
        this.getPaymentOverview();
      })
    );
    this.unSubscribe.push(
      this.dashboardService.refresh$.subscribe(() => {
        if (this.dashboardService.selectedChannelObservable.value) {
          this.getPaymentOverview();
        }
      })
    );
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    if (!this.paymentData?.items) return;
    const lower = term.toLowerCase();
    this.filteredItems = lower
      ? this.paymentData.items.filter(item => {
          const alpha2 = getAlpha2Code(item.countryCode);
          const countryName = ISO_3166_1_CODES
            .find(c => c.code === alpha2)?.country ?? '';
          return item.countryCode.toLowerCase().includes(lower) ||
            countryName.toLowerCase().includes(lower) ||
            item.localCurrencyCode.toLowerCase().includes(lower);
        })
      : [...this.paymentData.items];
  }

  openDrawer(index:number) {
    this.drawer.data = this.filteredItems;
    this.drawer.selectedOption = index;
    this.drawer.open();
  }

  getPaymentOverview(){
    this.isLoading = true;
    this.unSubscribe.push(
      this.dashboardService.getPaymentOverview().subscribe({
        next: (res: PaymentOverviewResponse) => {
          this.paymentData = res;
          this.paymentData.items.forEach((item) => {
            item.flag = GetFlagUrl(item.countryCode);
          });
          this.onSearch(this.searchTerm);
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        },
      })
    );
  }
}
