import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonComponent } from '@components/button/button.component';
import { SvgIcons, SvgSocialIcons } from '@utils/svg-icons';

@Component({
  selector: 'app-welcome',
  imports: [ButtonComponent],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss'
})
export class WelcomeComponent {
  router = inject(Router);
  socialIcons = SvgSocialIcons
  svgIcons = SvgIcons

  goToDashboard(){
    this.router.navigate(['/dashboard']);
  }
}
