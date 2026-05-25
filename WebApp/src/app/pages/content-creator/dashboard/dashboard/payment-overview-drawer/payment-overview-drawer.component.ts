import { SvgIcons } from '@utils/svg-icons';
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { Offcanvas } from 'bootstrap';
import { InlineSvgComponent } from '@components/inline-svg/inline-svg.component';
import { ButtonComponent } from '@components/button/button.component';
import { CompensationPayoutListComponent } from '../../compensation-payout-list/compensation-payout-list.component';
import { PaymentOverviewItem } from '@app-types/dashboard';

@Component({
  selector: 'app-payment-overview-drawer',
  imports: [CommonModule, InlineSvgComponent, ButtonComponent, CompensationPayoutListComponent],
  templateUrl: './payment-overview-drawer.component.html',
  styleUrl: './payment-overview-drawer.component.scss'
})
export class PaymentOverviewDrawerComponent implements AfterViewInit, OnDestroy {
  @Input() data: PaymentOverviewItem[] = [];
  @Input() selectedOption!: number;
  @ViewChild('offcanvasEl') offcanvasEl!: ElementRef;

  public paymentStep:1|2 = 1;
  public svgIcons = SvgIcons;

  ngAfterViewInit() {
    this.offcanvasEl.nativeElement.addEventListener('hidden.bs.offcanvas', () => {
      this.paymentStep = 1;
    });
  }

  get CurrentData(){
    if (this.data && this.selectedOption !== undefined) {
      return this.data[this.selectedOption];
    }
    return null;
  }

  ngOnDestroy() {
    if (this.offcanvasEl) {
      const instance = Offcanvas.getInstance(this.offcanvasEl.nativeElement);
      if (instance) {
        // Remove any pending transition callbacks before disposing
        this.offcanvasEl.nativeElement.classList.remove('show', 'showing', 'hiding');
        instance.dispose();
      }
    }
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
    Offcanvas.getOrCreateInstance(this.offcanvasEl.nativeElement).show();
  }

  closeDrawer() {
    Offcanvas.getOrCreateInstance(this.offcanvasEl.nativeElement).hide();
  }

}
