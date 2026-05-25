import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MessageUnitStatistics } from '@app-types/transaction-activity';
import { InlineSvgComponent } from '@components/inline-svg/inline-svg.component';
import { NumberFormatPipe } from '@pipes/number-format.pipe';
import { SvgIcons } from '@utils/svg-icons';

@Component({
  selector: 'app-transaction-top-earning-country',
  imports: [NumberFormatPipe, InlineSvgComponent],
  templateUrl: './transaction-top-earning-country.component.html',
  styleUrl: './transaction-top-earning-country.component.scss'
})
export class TransactionTopEarningCountryComponent implements OnChanges {
  @Input({required: true}) isLoading!: boolean;
  @Input({required: true}) messageStats!: MessageUnitStatistics | null;
  public svgIcons = SvgIcons;
  public selectedIndex = 0;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['messageStats']) {
      this.selectedIndex = 0;
    }
  }

  get currentCountry() {
    const countries = this.messageStats?.topCountries;
    if (countries && countries.length > 0) {
      return countries[this.selectedIndex];
    }
    return null;
  }

  get totalCountries(): number {
    return this.messageStats?.topCountries?.length ?? 0;
  }

  get positionLabel(): string {
    return `#${this.selectedIndex + 1}`;
  }

  get showArrows(): boolean {
    return this.totalCountries > 1;
  }

  goLeft() {
    if (this.selectedIndex > 0) {
      this.selectedIndex -= 1;
    }
  }

  goRight() {
    if (this.selectedIndex < this.totalCountries - 1) {
      this.selectedIndex += 1;
    }
  }
}
