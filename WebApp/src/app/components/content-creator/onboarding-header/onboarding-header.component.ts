import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SvgIcons } from '@utils/svg-icons';
import { SupportDialogComponent } from './support-dialog/support-dialog.component';

@Component({
  selector: 'app-onboarding-header',
  imports: [SupportDialogComponent],
  templateUrl: './onboarding-header.component.html',
  styleUrl: './onboarding-header.component.scss'
})
export class OnboardingHeaderComponent {
  svgIcon = SvgIcons;
  isSupportOpen = false;

  private router = inject(Router);

  goHome(){
    this.router.navigate(['/']);
  }
}
