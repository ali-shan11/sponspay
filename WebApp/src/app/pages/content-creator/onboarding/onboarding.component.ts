import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { GetStartedComponent } from "./get-started/get-started.component";
import { YoutubeChannelSelectorComponent } from "./youtube-channel-selector/youtube-channel-selector.component";
import { EstimatorComponent } from './estimator/estimator.component';
import { FinishComponent } from './finish/finish.component';
import { IntegrationComponent } from './integration/integration.component';
import { WelcomeComponent } from "./welcome/welcome.component";
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { OnboardingService } from '@services/onboarding.service';
import { SvgIcons } from '@utils/svg-icons';
import { StepTrackerComponent } from '@components/step-tracker/step-tracker.component';
import { ButtonComponent } from '@components/button/button.component';
import { ONBOARDING_STEPS } from '@utils/enums';
import { AcceptTermsResponse } from '@app-types/onboarding';
import { AuthService } from '@services/auth.service';
import { YouTubeOAuthService } from '@services/youtube-oauth.service';
import { ChannelInfo } from '@app-types/youtube-analytics';

@Component({
  selector: 'app-onboarding',
  imports: [GetStartedComponent, YoutubeChannelSelectorComponent, StepTrackerComponent, IntegrationComponent, EstimatorComponent, FinishComponent, ButtonComponent, WelcomeComponent, NgClass],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss'
})
export class OnboardingComponent implements OnInit, OnDestroy{

  public onboardingService= inject(OnboardingService);
  public svgIcon = SvgIcons;
  public stepList = [
    {label: 'Get Started'},
    {label: 'YouTube Channel'},
    {label: 'Estimator'},
    {label: 'Integration'},
    {label: 'Finish'},
  ];
  public showPotentialEarning = false;
  public isInitializing = true;
  public STEP = ONBOARDING_STEPS;
  public AcceptedTermsVersion = 0;
  public availableChannels: ChannelInfo[] = []

  private router = inject(Router);
  private authService = inject(AuthService);
  private youtubeOAuthService = inject(YouTubeOAuthService);
  
  ngOnInit(): void {
    this.onboardingService.propagateUser(this.authService.getSignInResponse());
    this.isInitializing = false;
    this.subAvailableChannels();
  }

  ngOnDestroy(): void {
    this.onboardingService.resetOnboarding();
  }

  get youtubeConnected(): boolean {
    return this.youtubeOAuthService.getConnectionStatus().connected;
  }

  get selectedChannel(){
    return this.youtubeOAuthService.selectedChannel;
  }

  subAvailableChannels(){
    this.youtubeOAuthService.availableChannels$.subscribe((channels:ChannelInfo[])=>{
      this.availableChannels = channels;
    })
  }

  goToIntegration(){
    this.onboardingService.gotoNextStep();
    this.showPotentialEarning = false;
  }

  async goBackToYouTubeStep(){
    if (this.youtubeConnected) {
      try {
        await this.youtubeOAuthService.disconnectYouTube();
      } catch (error) {
        console.error('Failed to disconnect YouTube:', error);
      }
    }
    this.onboardingService.gotoPreviousStep();
  }

  goBackToEstimator(){
    this.onboardingService.gotoPreviousStep();
  }

  async goBackToLogin(){
    try {
      // Sign out clears all state (including YouTube, onboarding step resets to 0)
      // skipNavigation keeps the user on the onboarding page at step 0
      await this.authService.signOut({ skipNavigation: true });
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  }

  onShowEarningClick(event:boolean){
    this.showPotentialEarning = event;
  }

  onCancelClick(){
    this.onboardingService.currentStep=this.onboardingService.currentStep-1;
    this.router.navigate(['/cancellation']);
  }

  acceptedTerms(event:number){
    this.AcceptedTermsVersion = event;
  }

  acceptTermsContinue(){
    this.onboardingService.acceptTerms(this.AcceptedTermsVersion).subscribe({
      next: (res:AcceptTermsResponse) => {
        if(res.success){
          this.onboardingService.currentStep = this.onboardingService.currentStep+1;
        }
       }
     })
  }
  
}
