import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OnboardingHeaderComponent } from '@components/content-creator/onboarding-header/onboarding-header.component';

@Component({
  selector: 'app-onboarding-layout',
  imports: [RouterOutlet, OnboardingHeaderComponent],
  templateUrl: './onboarding-layout.component.html',
  styleUrl: './onboarding-layout.component.scss'
})
export class OnboardingLayoutComponent {

}
