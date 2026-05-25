import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InlineSvgComponent } from '@components/inline-svg/inline-svg.component';
import { ButtonComponent } from '@components/button/button.component';
import { CompensationPayoutListComponent } from '../../compensation-payout-list/compensation-payout-list.component';
import { SvgCountryFlags, SvgIcons } from '@utils/svg-icons';

@Component({
  selector: 'app-compensation-detail',
  imports: [CommonModule, InlineSvgComponent, ButtonComponent, CompensationPayoutListComponent],
  templateUrl: './compensation-detail.component.html',
  styleUrl: './compensation-detail.component.scss'
})
export class CompensationDetailComponent {  
  public paymentStep:1|2 = 1;
  public svgIcons = SvgIcons;
  public flagIcons = SvgCountryFlags;
}
