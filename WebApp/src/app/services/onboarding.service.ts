import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { ONBOARDING_STEPS } from '@utils/enums';
import { AcceptTermsResponse, CancelOnboardingBody, ChannelAvailabilityBody, ChannelAvailabilityResponse, ChannelInviteResponse, CoAdminStatusResponse, CreatorSignInBody, CreatorSignInResponse, OnboardCreatorBody, OnboardCreatorResponse, TermsResponse } from '@app-types/onboarding';
import { CUSTOM_REQUEST_CONTEXT } from '../auth/interceptor/http-context.tokens';
import { APP_ENDPOINTS } from '@utils/urls';
import { REDIRECT_TO_DASHBOARD_FROM } from '@utils/constants';
import { YouTubeOAuthService } from '@services/youtube-oauth.service';

@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  private BASE_URL = environment.API_BASE;
  private http = inject(HttpClient);
  private router = inject(Router);
  private youtubeOAuthService = inject(YouTubeOAuthService);
  public currentStep = ONBOARDING_STEPS.GET_STARTED;
  public integrationStep = 1;
  public telegramJoined = false;

  // Estimator percentages - set by estimator component, used during onboarding
  public youtubePayingUsersPercentage = 0;
  public sponspayPayingUsersPercentage = 0;

  public loaderContext = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, {
    showLoader:true
  });

  gotoNextStep(){
    this.currentStep += 1;
  }

  gotoPreviousStep(){
    this.currentStep -= 1;
  }

  checkTelegramHandleAvailability(body:ChannelAvailabilityBody): Observable<ChannelAvailabilityResponse> {
    return this.http.post<ChannelAvailabilityResponse>(this.BASE_URL + APP_ENDPOINTS.CHECK_CHANNEL_AVAILABILITY, body);
  }

  getTermsHtml(): Observable<TermsResponse> {
    return this.http.get<TermsResponse>(this.BASE_URL + APP_ENDPOINTS.TERMS_LATEST, {context:this.loaderContext});
  }

  acceptTerms(termsVersion:number): Observable<AcceptTermsResponse> {
    const body = {version: termsVersion};
    return this.http.post<AcceptTermsResponse>(this.BASE_URL + APP_ENDPOINTS.ACCEPT_TERMS, body, {context:this.loaderContext});
  }

  signInCreator(body: CreatorSignInBody): Observable<CreatorSignInResponse>{
    return this.http.post<CreatorSignInResponse>(this.BASE_URL + APP_ENDPOINTS.SIGN_IN_CREATOR , body, {context:this.loaderContext})
  }

  cancelOnboarding(body: CancelOnboardingBody){
    return this.http.post(this.BASE_URL + APP_ENDPOINTS.CANCEL_ONBOARDING, body, {context:this.loaderContext})
  }

  getChannelInviteInfo():Observable<ChannelInviteResponse>{
    return this.http.get<ChannelInviteResponse>(this.BASE_URL + APP_ENDPOINTS.CHANNEL_INVITE_INFO, {context:this.loaderContext})
  }

  /**
   * Check co-admin status without regenerating invite links
   * Used for polling fallback when WebSocket is unavailable
   */
  getCoAdminStatus():Observable<CoAdminStatusResponse>{
    const context = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, {
      showLoader: false,
      skipAlert: true
    });
    return this.http.get<CoAdminStatusResponse>(this.BASE_URL + APP_ENDPOINTS.CO_ADMIN_STATUS, {context})
  }

  /**
   * Determine the correct onboarding step based on sign-in response and navigate.
   * Called after authentication completes.
   */
  propagateUser(data: CreatorSignInResponse | null | undefined): void {
    if (!data) return;

    // Sync YouTube connection status from backend to frontend service
    if (data.youtubeConnected) {
      this.youtubeOAuthService.setConnectionStatus({ connected: true, error: null });
    }

    if (data?.youtubeConnected && data.isCreator && data.hasAcceptedTerms) {
      this.navigateToDashboard();
    } else {
      if (!data.isCreator) {
        if (data.youtubeConnected) {
          this.currentStep = ONBOARDING_STEPS.REVENUE_ESTIMATOR;
        } else {
          this.currentStep = ONBOARDING_STEPS.YOUTUBE_CHANNEL;
        }
      } else if (!data.hasAcceptedTerms) {
        if (!data.isCoAdmin) {
          if (data.isCreator) {
            this.integrationStep = 2;
          }
          this.currentStep = ONBOARDING_STEPS.INTEGRATION;
        } else {
          this.currentStep = ONBOARDING_STEPS.TERMS_CONDITIONS;
        }
      }
      this.router.navigate(['onboarding']);
    }
  }

  navigateToDashboard(): void {
    const currentUrl = this.router.url.split('?')[0];
    if (REDIRECT_TO_DASHBOARD_FROM.includes(currentUrl)) {
      this.router.navigate(['dashboard']);
    }
  }

  /**
   * Onboard a creator by creating a telegram handle
   */
  onBoardCreator(
    handle: string,
    youtubePercentage: number,
    sponspayPercentage: number
  ): Observable<OnboardCreatorResponse | string> {
    const selected = this.youtubeOAuthService.selectedChannel;
    if (selected) {
      const body: OnboardCreatorBody = {
        youtubeChannelId: selected.id,
        telegramHandle: handle,
        youtubePayingUsersPercentage: youtubePercentage,
        sponspayPayingUsersPercentage: sponspayPercentage
      };
      const context = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, {
        customSuccessAlert: {
          title: 'Channel Created'
        },
        showLoader: true
      });
      return this.http.post<OnboardCreatorResponse>(this.BASE_URL + "/creator/onboard", body, { context });
    }
    return of("No channel selected");
  }

  resetOnboarding(){
    this.currentStep = ONBOARDING_STEPS.GET_STARTED;
    this.integrationStep = 1;
    this.telegramJoined = false;
    this.youtubePayingUsersPercentage = 0;
    this.sponspayPayingUsersPercentage = 0;
  }
}
