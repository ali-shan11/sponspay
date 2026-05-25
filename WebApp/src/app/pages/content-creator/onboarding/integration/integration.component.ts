import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { UserData } from '@app-types/components';
import { ChannelAvailabilityResponse, ChannelInviteResponse, OnboardCreatorResponse } from '@app-types/onboarding';
import { BadgeComponent } from '@components/badge/badge.component';
import { ButtonComponent } from '@components/button/button.component';
import { CustomInputComponent } from '@components/custom-input/custom-input.component';
import { AlertService } from '@services/alert.service';
import { AuthService } from '@services/auth.service';
import { YouTubeOAuthService } from '@services/youtube-oauth.service';
import { OnboardingService } from '@services/onboarding.service';
import { TokenService } from '@services/token.service';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../../../environments/environment';
import { generateQR } from '@utils/constants';
import { LearnMoreDialogComponent } from './learn-more-dialog/learn-more-dialog.component';

enum Step2State {
  LOADING_QR = 'loading_qr',
  WAITING_FOR_JOIN = 'waiting_for_join',
  PROMOTING = 'promoting',
  SUCCESS = 'success',
  TIMEOUT = 'timeout',
  ERROR = 'error'
}

@Component({
  selector: 'app-integration',
  imports: [BadgeComponent, CustomInputComponent, ButtonComponent, LearnMoreDialogComponent],
  templateUrl: './integration.component.html',
  styleUrl: './integration.component.scss'
})
export class IntegrationComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private youtubeOAuthService = inject(YouTubeOAuthService);
  public onboardingService= inject(OnboardingService);
  private tokenService = inject(TokenService);
  private alertService = inject(AlertService);

  public telegramHandles: string[] = [];
  // public integrationStep = 1;a
  public selectedHandle:string | null = null;
  public loadingHandles = new Set<string>();
  public takenHandles: string[] = [];
  public isCheckingAllHandles = false;
  public isCheckingHandle = false;
  public user: UserData | null = this.tokenService.getCurrentUserObj();
  public handleControl = new FormControl('');
  public onboardedData: OnboardCreatorResponse | null = null;
  public isCreateLoading = false;
  public isLearnMoreOpen = false;
  public channelData: ChannelInviteResponse | null = null;

  // Step 2 state management
  public step2State: Step2State = Step2State.LOADING_QR;
  public Step2State = Step2State; // Export for template
  private qrCodeTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly QR_CODE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  
  // WebSocket and polling
  private socket: Socket | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private readonly POLLING_INTERVAL = 5000; // 5 seconds
  
  ngOnInit(): void {
    this.subHandleNameChange();
    this.telegramHandles = this.generateTelegramHandles();
    this.checkAllHandlesAvailability();

    if (this.onboardingService.integrationStep===2) {
      this.getChannelInvite();
    }
  }

  subHandleNameChange(){
    this.handleControl.valueChanges.pipe(debounceTime(500), distinctUntilChanged()).subscribe((handle)=>{
      if (this.selectedHandle && handle !== this.selectedHandle) {
        this.selectedHandle = null;
      }
      this.checkSingleHandleAvailability([handle as string]);
    })
  }

  onHandleClick(handle:string){
    if (this.takenHandles.includes(handle)) {
      return;
    }

    if (this.selectedHandle == handle) {
      this.selectedHandle = null;
      this.handleControl.setValue('');
    }else{
      this.selectedHandle = handle;
      this.handleControl.setValue(handle);
    }
  }

  goToStep2(){
    this.onboardingService.integrationStep = 2;
    this.getChannelInvite();
  }

  get selectedChannel(){
    return this.youtubeOAuthService.selectedChannel;
  }

  generateTelegramHandles(): string[] {
    const title = this.selectedChannel?.title || '';
    const suggestions: string[] = [];

    if (title.trim().length > 0) {
      // Strip non-alphanumeric/underscore, lowercase, ensure starts with letter
      const clean = title.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
      const base = clean.length >= 5 ? clean : `${clean}_channel`;
      const suffix4 = Math.floor(Math.random() * 10000);
      const suffix6 = Math.random().toString(36).substring(2, 8);

      suggestions.push(
        base,
        `${clean}${suffix4}`,
        `${clean}_${suffix6}`,
        `${clean}_premium`
      );
    } else {
      for (let i = 0; i < 4; i++) {
        const random = Math.random().toString(36).substring(2, 8);
        suggestions.push(`creator_${random}`);
      }
    }

    return suggestions.filter(h => h.length >= 5 && h.length <= 32);
  }

  isCheckingAvailability(handle: string): boolean {
    return this.loadingHandles.has(handle);
  }

  checkAllHandlesAvailability() {
    this.isCheckingAllHandles = true;
    this.telegramHandles.forEach(handle => {
      this.loadingHandles.add(handle);
    });

    this.onboardingService.checkTelegramHandleAvailability({handles:this.telegramHandles}).subscribe({
      next: (results: ChannelAvailabilityResponse) => {
        results.taken.forEach((handler) => {
          if (results.taken.includes(handler)) {
            this.takenHandles.push(handler);
          }
          this.loadingHandles.delete(handler);
        });
        
        this.isCheckingAllHandles = false;
      },
      error: (err) => {
        this.isCheckingAllHandles = false;
        console.error(err);
      }
    });
  }

  checkSingleHandleAvailability(handles: string[]) {
    this.isCheckingHandle = true;

    this.onboardingService.checkTelegramHandleAvailability({handles}).subscribe({
      next: (results: ChannelAvailabilityResponse) => {
        // results.taken = ['123'];
        if (results.taken.includes(handles[0])) {
          this.handleControl.setErrors({ handle_taken: true });
        }
        this.isCheckingHandle = false;
      },
      error: (err) => {
        this.isCheckingHandle = false;
        console.error(err);
      }
    });
  }

  onboardCreator(){
    if (!this.handleControl?.value || (this.handleControl?.value && this.handleControl.errors?.['handle_taken'])) {
      this.alertService.error('Invalid Handle', 'Please enter a valid handle.');
      return;
    }

    if (this.handleControl.valid && this.handleControl.value) {
      this.isCreateLoading = true;
      this.onboardingService.onBoardCreator(
        this.handleControl?.value as string,
        this.onboardingService.youtubePayingUsersPercentage,
        this.onboardingService.sponspayPayingUsersPercentage
      ).subscribe({
        next: (result:OnboardCreatorResponse | string)=>{
          if (typeof result == 'string') {
            this.alertService.error('Error', result );
          }
          if (typeof result !== 'string' && result.success) {
            this.onboardedData = result;
            this.goToStep2();
          }
          this.isCreateLoading = false;
        },
        error: (err)=>{
          this.alertService.error('Error', err?.error?.message );
          this.isCreateLoading = false;
        }
      });
    }
  }

  getChannelInvite(){
    this.step2State = Step2State.LOADING_QR;
    
    this.onboardingService.getChannelInviteInfo().subscribe({
      next: async (res: ChannelInviteResponse)=>{
        this.channelData = res;
        
        if (!res.inviteLink) {
          this.step2State = Step2State.ERROR;
          this.alertService.error('Error', 'Unable to generate invite link. Please contact support.');
          return;
        }
        
        // Check if already promoted (returning to this step)
        if (res.coAdminAdded) {
          this.step2State = Step2State.SUCCESS;
          this.onboardingService.telegramJoined = true;
          return;
        }
        
        // Transition to waiting state immediately (QR generates in background)
        this.step2State = Step2State.WAITING_FOR_JOIN;

        // Start timeout
        this.startQRCodeTimeout();

        // Initialize WebSocket + polling fallback
        this.initializeWebSocket();
        this.startPollingFallback();

        // Generate QR in background (template shows skeleton until ready)
        this.channelData.qr = await generateQR(res.inviteLink);
      },
      error: (err) => {
        this.step2State = Step2State.ERROR;
        this.alertService.error('Error', err?.error?.message || 'Failed to load channel info');
      }
    })
  }
  
  /**
   * Start the QR code timeout timer
   * QR codes expire after 5 minutes
   */
  private startQRCodeTimeout() {
    this.clearQRCodeTimeout();
    this.qrCodeTimeout = setTimeout(() => {
      this.handleQRCodeTimeout();
    }, this.QR_CODE_TIMEOUT);
  }

  /**
   * Clear the QR code timeout timer
   */
  private clearQRCodeTimeout() {
    if (this.qrCodeTimeout) {
      clearTimeout(this.qrCodeTimeout);
      this.qrCodeTimeout = null;
    }
  }

  /**
   * Handle QR code timeout
   * Transitions to timeout state and disconnects WebSocket
   */
  private handleQRCodeTimeout() {
    this.step2State = Step2State.TIMEOUT;
    this.disconnectWebSocket();
  }

  /**
   * Refresh QR code after timeout
   * Clears timeout and reconnects WebSocket
   */
  public refreshQRCode() {
    this.clearQRCodeTimeout();
    this.disconnectWebSocket();
    this.getChannelInvite();
  }

  /**
   * Initialize WebSocket connection for real-time co-admin promotion events
   */
  private async initializeWebSocket() {
    // Get Firebase user to access UID
    const firebaseUser = await this.authService.getCurrentUser();
    if (!firebaseUser?.uid) {
      console.error('Cannot initialize WebSocket: user UID not available');
      this.startPollingFallback();
      return;
    }
    
    const firebaseUid = firebaseUser.uid;

    try {
      // Connect to WebSocket
      this.socket = io(`${environment.API_BASE}/telegram`, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      // Connection handlers
      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        // Backend emits to rooms with 'user:' prefix, so we must join with the same format
        this.socket?.emit('joinUserRoom', firebaseUid);
      });

      this.socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.startPollingFallback();
      });

      // Listen for co-admin promotion event
      this.socket.on('coAdminAdded', (data: { channelHandle: string; timestamp: string; status: string }) => {
        console.log('Co-admin promotion received:', data);
        this.handleCoAdminAdded();
      });

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      this.startPollingFallback();
    }
  }

  /**
   * Disconnect WebSocket and stop polling
   */
  private disconnectWebSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.stopPollingFallback();
  }

  /**
   * Handle co-admin promotion event
   * Updates state to show success
   */
  private handleCoAdminAdded() {
    // Clear timeout
    this.clearQRCodeTimeout();

    // Stop polling if active
    this.stopPollingFallback();

    // Update state
    this.step2State = Step2State.PROMOTING;

    // Brief delay to show promoting state, then advance
    setTimeout(() => {
      this.step2State = Step2State.SUCCESS;
      this.onboardingService.telegramJoined = true;
    }, 500);
  }

  /**
   * Start polling fallback when WebSocket unavailable
   * Polls every 5 seconds to check co-admin status
   */
  private startPollingFallback() {
    if (this.pollingInterval) return; // Already polling
    
    console.log('Starting polling fallback');
    this.pollingInterval = setInterval(() => {
      this.checkCoAdminStatus();
    }, this.POLLING_INTERVAL);
  }

  /**
   * Stop polling fallback
   */
  private stopPollingFallback() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Check co-admin status via API polling
   * Used as fallback when WebSocket is unavailable
   * Uses lightweight endpoint that doesn't regenerate invite links
   */
  private checkCoAdminStatus() {
    this.onboardingService.getCoAdminStatus().subscribe({
      next: (res) => {
        if (res.coAdminAdded) {
          // User has been promoted
          this.handleCoAdminAdded();
        }
      },
      error: (err) => {
        console.error('Error checking co-admin status:', err);
      }
    });
  }

  openTelegram(inviteLink:string | null =''){
    if(inviteLink){
      window.open(inviteLink, '_blank');
    }
  }

  /**
   * Component cleanup
   */
  ngOnDestroy() {
    this.disconnectWebSocket();
    this.clearQRCodeTimeout();
  }

  // async generateQR(qrData: string): Promise<string> {
  //   const qrCode = new QRCodeStyling({
  //     width: 185,
  //     height: 185,
  //     data: qrData,
  //     image: 'svg/message-table.svg',
  //     dotsOptions: {
  //       color: '#000', 
  //       type: 'rounded'
  //     },
  //     imageOptions: {
  //       crossOrigin: 'anonymous',
  //       margin: 5
  //     },
  //     cornersSquareOptions: {
  //       type: 'extra-rounded'
  //     }
  //   });

  //   const blob = await qrCode.getRawData('png');

  //   const dataUrl: string = await new Promise((resolve, reject) => {
  //     const reader = new FileReader();
  //     reader.onload = () => resolve(reader.result as string);
  //     reader.onerror = () => reject(new Error('QR code data conversion error'));
  //     reader.readAsDataURL(blob as Blob);
  //   });
  //   return dataUrl;
  // }
}
