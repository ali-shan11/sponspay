import { Component } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { SvgSocialIcons, SvgIcons } from '@utils/svg-icons';

@Component({
  selector: 'app-thank-you',
  imports: [ButtonComponent],
  templateUrl: './thank-you.component.html',
  styleUrl: './thank-you.component.scss'
})
export class ThankYouComponent {
  socialIcons = SvgSocialIcons;
  svgIcons = SvgIcons;
}
