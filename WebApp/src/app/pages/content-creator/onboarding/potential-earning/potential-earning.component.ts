
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { NgOptionComponent, NgSelectComponent } from '@ng-select/ng-select';
import { FormsModule } from '@angular/forms';
import { SvgIcons } from '@utils/svg-icons';
import { CountryViewerData, PaymentAccessCalculation } from '@app-types/onboarding';
import { InlineSvgComponent } from '@components/inline-svg/inline-svg.component';
@Component({
  selector: 'app-potential-earning',
  imports: [FormsModule, InlineSvgComponent, NgSelectComponent, NgOptionComponent],
  templateUrl: './potential-earning.component.html',
  styleUrl: './potential-earning.component.scss'
})
export class PotentialEarningComponent implements OnChanges {

  @Input() countryViewerData: CountryViewerData[] = [];
  @Input() totalSubscribers = 0;
  @Input() sponspayPayablePercent = 0;
  @Output() backToResults = new EventEmitter<void>();

  svgIcons = SvgIcons;
  public selectedCountry:CountryViewerData | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if(changes['countryViewerData'] && changes['countryViewerData'].currentValue) {
      this.selectedCountry = this.countryViewerData?.length
        ? this.countryViewerData.reduce((max, c) => c.viewersInSponspayCountry > max.viewersInSponspayCountry ? c : max)
        : null;
    }
  }

  get displayCountryData(): CountryViewerData[] {
    return this.countryViewerData;
  }

  get paymentCalculations(): PaymentAccessCalculation[] {
    return this.displayCountryData.map(country => {
      // Column 3: Viewers x Credit Card Share
      const avgTotalViewersWithYouTubeAccess =
        country.viewersInSponspayCountry * (country.creditCardMarketShare / 100);

      // Column 5: MAX(Viewers x Mobile Share, Column 3)
      const mobileViewers =
        country.viewersInSponspayCountry * (country.mobileSimCardMarketShare / 100);
      const avgAdditionalViewersWithPaymentAccess =
        Math.max(mobileViewers, avgTotalViewersWithYouTubeAccess);

      // Column 6: Column 3 + Column 5
      const avgTotalViewersWithPaymentAccess =
        avgTotalViewersWithYouTubeAccess + avgAdditionalViewersWithPaymentAccess;

      return {
        country,
        avgTotalViewersWithYouTubeAccess: Math.round(avgTotalViewersWithYouTubeAccess),
        avgAdditionalViewersWithPaymentAccess: Math.round(avgAdditionalViewersWithPaymentAccess),
        avgTotalViewersWithPaymentAccess: Math.round(avgTotalViewersWithPaymentAccess)
      };
    });
  }

  get totalYouTubeAccess(): number {
    return this.paymentCalculations.reduce((sum, calc) =>
      sum + calc.avgTotalViewersWithYouTubeAccess, 0);
  }

  get totalAdditionalAccess(): number {
    return this.paymentCalculations.reduce((sum, calc) =>
      sum + calc.avgAdditionalViewersWithPaymentAccess, 0);
  }

  get totalPaymentAccess(): number {
    return this.paymentCalculations.reduce((sum, calc) =>
      sum + calc.avgTotalViewersWithPaymentAccess, 0);
  }

  calculateMultiple(): string {
    if (this.totalYouTubeAccess === 0) return '0';
    const multiple = this.totalPaymentAccess / this.totalYouTubeAccess;
    return multiple.toFixed(1);
  }

  goBackToResults(event: Event) {
    event.preventDefault();
    this.backToResults.emit();
  }
}
