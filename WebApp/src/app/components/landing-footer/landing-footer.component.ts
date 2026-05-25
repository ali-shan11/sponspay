import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SvgIcons, SvgSocialIcons } from '@utils/svg-icons';

@Component({
  selector: 'app-landing-footer',
  imports: [RouterLink],
  templateUrl: './landing-footer.component.html',
  styleUrl: './landing-footer.component.scss'
})
export class LandingFooterComponent {
  svgIcon = SvgIcons;
  socialIcons = SvgSocialIcons;
  public currentYear = new Date().getFullYear();
}
