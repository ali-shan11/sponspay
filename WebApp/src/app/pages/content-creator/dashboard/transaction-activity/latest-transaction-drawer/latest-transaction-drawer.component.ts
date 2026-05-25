import { SvgIcons } from '@utils/svg-icons';

import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { Offcanvas } from 'bootstrap';
import { InlineSvgComponent } from '@components/inline-svg/inline-svg.component';
import { ButtonComponent } from '@components/button/button.component';
import { CompensationPayoutListComponent } from '../../compensation-payout-list/compensation-payout-list.component';
import { LatestTransaction } from '@app-types/transaction-activity';

@Component({
  selector: 'app-latest-transaction-drawer',
  imports: [InlineSvgComponent, ButtonComponent, CompensationPayoutListComponent],
  templateUrl: './latest-transaction-drawer.component.html',
  styleUrl: './latest-transaction-drawer.component.scss'
})
export class LatestTransactionDrawerComponent implements AfterViewInit, OnDestroy {
  @Input() data: LatestTransaction[] = [];
  @Input() selectedOption!: number;
  @ViewChild('offcanvasEl') offcanvasEl!: ElementRef;

  public paymentStep:1|2 = 1;
  public svgIcons = SvgIcons;
  private offcanvasInstance: Offcanvas | undefined;

  ngAfterViewInit() {
    const el = this.offcanvasEl.nativeElement;
    this.offcanvasInstance = new Offcanvas(el);
  }

  get CurrentData(){
    if (this.data && this.selectedOption !== undefined) {
      return this.data[this.selectedOption];
    }
    return null;
  }

  ngOnDestroy() {
    this.offcanvasInstance?.dispose();
  }

  goLeft(){
    if (this.selectedOption !== 0) {
      this.selectedOption -= 1;
    }
  }

  goRight(){
    if (this.data.length > 0 && this.selectedOption < this.data.length - 1) {
      this.selectedOption += 1;
    }
  }

  open() {
    this.offcanvasInstance?.show();
  }

  closeDrawer() {
    this.offcanvasInstance?.hide();
  }
}
