import { SvgIcons } from '@utils/svg-icons';
import { Component, inject, OnInit } from '@angular/core';
import { ConfirmCancellationComponent } from "./confirm-cancellation/confirm-cancellation.component";
import { Router } from '@angular/router';
import { User } from '@angular/fire/auth';
import { ButtonComponent } from '@components/button/button.component';
import { ThankYouComponent } from './thank-you/thank-you.component';
import { AuthService } from '@services/auth.service';
import { OnboardingService } from '@services/onboarding.service';
import { CancelOnboarding, CancelOnboardingBody } from '@app-types/onboarding';

@Component({
  selector: 'app-cancellation',
  imports: [ButtonComponent, ThankYouComponent, ConfirmCancellationComponent],
  templateUrl: './cancellation.component.html',
  styleUrl: './cancellation.component.scss'
})
export class CancellationComponent implements OnInit {
  svgIcon= SvgIcons;
  currentStep = 0;
  user: User | null = null;
  isLoading = false;
  reason = '';
  keepMeUpdated = false;
  
  private router = inject(Router);
  private authService = inject(AuthService);
  private onBoardingService = inject(OnboardingService);

  async ngOnInit(): Promise<void> {
    this.authService.user$.subscribe((res)=>{
      this.user = res;
    });
  }

  onBackClick(){
    this.router.navigate(['/onboarding']);
  }

  handleReasonChange(event:CancelOnboarding){
    this.reason = event.reason;
    this.keepMeUpdated = event.keepMeUpdated;
  }

  cancel(){
    this.isLoading = true;
    const body: CancelOnboardingBody = {
      reason: this.reason,
      wantsUpdates: this.keepMeUpdated,
    };
    this.onBoardingService.cancelOnboarding(body).subscribe(
      ()=>{
        this.currentStep=this.currentStep+1
        setTimeout(() => {
          this.handleSignout();
        }, 2000);
      }
    )
  }

  handleSignout(){
    this.authService.signOut();
  }
}
