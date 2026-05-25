import { Component } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { SvgIcons } from '@utils/svg-icons';

@Component({
  selector: 'app-social',
  imports: [ButtonComponent],
  templateUrl: './social.component.html',
  styleUrl: './social.component.scss'
})
export class SocialComponent {
  svgIcon = SvgIcons;
}
