import { FAN_MESSAGE_TYPE, REFERRAL_CAMPAIGN, REFERRAL_MEDIUM, REFERRAL_SOURCE } from './../../../utils/enums';
import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators, ɵInternalFormsSharedModule } from '@angular/forms';
import { UserCommentComponent } from "./user-comment/user-comment.component";
import { CustomSelectComponent } from '@components/custom-select/custom-select.component';
import { CustomInputComponent } from '@components/custom-input/custom-input.component';
import { ButtonComponent } from '@components/button/button.component';
import { LocalVars } from '@utils/constants';
import { ActivatedRoute, Router } from '@angular/router';
import { FanService } from '@services/fan.service';
import { FanChannelInfo, FanCountry, FanOperator, FanPayment, PredictProviderResponse, RecentComment, SendFanPaymentBody } from '@app-types/fan';
import { AlertService } from '@services/alert.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AccountsService } from '@services/accounts.service';
import { PawapayService } from '@services/pawapay.service';
import { PhoneNumberComponent } from "@components/phone-number/phone-number.component";
import { CustomTextareaComponent } from "@components/custom-textarea/custom-textarea.component";
import { PaymentProcessingComponent } from "../payment-processing/payment-processing.component";
import { MessageSuccessComponent } from "../message-success/message-success.component";
import { MessageFailedComponent } from "../message-failed/message-failed.component";
import { RefundPolicyModalComponent } from "../refund-policy-modal/refund-policy-modal.component";
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';
import { generateQR } from '@utils/constants';
import { getAlpha2Code } from '@utils/countrycodes';
import { PROVIDERS_STATUS } from '@utils/enums';
import { debounceTime, distinctUntilChanged, filter, Subscription } from 'rxjs';
import { parseReferralFromWindow, ReferralInfo } from '@utils/referrer.util';

@Component({
  selector: 'app-fan-video',
  imports: [CustomSelectComponent,
    CustomInputComponent,
    ButtonComponent,
    UserCommentComponent,
    PhoneNumberComponent,
    CustomTextareaComponent,
    PaymentProcessingComponent,
    MessageSuccessComponent,
    MessageFailedComponent,
    RefundPolicyModalComponent,
    ɵInternalFormsSharedModule,
    ReactiveFormsModule
  ],
  templateUrl: './fan-video.component.html',
  styleUrl: './fan-video.component.scss',
})
export class FanVideoComponent implements OnInit, OnDestroy {
  public showRefundPolicy = false;
  public isLoading = true;
  public youtubeUrl: SafeResourceUrl | undefined;
  public isDescriptionExpanded = false;
  public descriptionLimit = 140;
  public showMoreButton = this.formattedDescription?.length > this.descriptionLimit;
  public messageForm!: FormGroup;
  public route = inject(ActivatedRoute);
  public fb = inject(FormBuilder);
  public router = inject(Router);
  public alertService = inject(AlertService);
  public fanService = inject(FanService);
  public accountService = inject(AccountsService);
  public pawapayService = inject(PawapayService);
  public sanitizer = inject(DomSanitizer);

  public multiples = [1, 2, 5, 10, 20];
  public paymentAmounts: number[] = [];
  public selectedAmount = 0;
  public handle!: string;
  public handleInfo!: FanChannelInfo;
  public selectedOperator: FanOperator | null = null;
  public selectedCountry: FanCountry | null = null;
  public paymentInitResponse!: FanPayment;
  public paymentModal: 'processing' | 'message_received' | 'success' | 'failed' | 'refunded' | 'timed_out' | null = null;
  public remainingSeconds = 0;
  public defaultSubject!: string;
  public subArr: Subscription[] = [];
  public sourceList = [
    { key: REFERRAL_SOURCE.FACEBOOK, value: 'Facebook' },
    { key: REFERRAL_SOURCE.INSTAGRAM, value: 'Instagram' },
    { key: REFERRAL_SOURCE.EMAIL, value: 'Email' },
  ]
  public mediumList = [
    { key: REFERRAL_MEDIUM.SOCIAL, value: 'Social' },
    { key: REFERRAL_MEDIUM.CPC, value: 'CPC' },
    { key: REFERRAL_MEDIUM.ORGANIC, value: 'Organic' },
  ]
  public referralCampaigns = [
    { key: REFERRAL_CAMPAIGN.SUMMER_2025, value: 'Summer 2025' },
    { key: REFERRAL_CAMPAIGN.LAUNCH_PROMO, value: 'Launch Promo' },
  ]
  public isPredicting = false;
  public predictedCountryIso2: string | null = null;
  public cachedSupportedCountryIso2: string[] = [];
  private socket: Socket | null = null;
  private currentIdempotencyKey: string | null = null;
  private videoTitle = '';
  private transTimer!: ReturnType<typeof setInterval>;
  private predictSubscription: Subscription | null = null;
  private predictionInProgress = false;
  private referral: ReferralInfo | null = null;

  @ViewChild('telegramBlock', { read: ElementRef }) telegramBlock?: ElementRef<HTMLElement>;


  constructor() {
    this.configureForm();
  }

  ngOnDestroy(): void {
    this.clearTransTimer();
    this.disconnectWebSocket();
    this.subArr.forEach(sub => sub.unsubscribe());
  }

  ngOnInit(): void {
    this.handle = this.route.snapshot.paramMap.get('handle')!;
    this.referral = parseReferralFromWindow(this.route);
    this.subOperatorControl();
    this.subPhoneNumberControl();
    this.getChannelInfo();
  }

  checkPrevSession() {
    const prevSessionId = localStorage.getItem(LocalVars.transSessionId);
    if (prevSessionId) {
      this.startTransTimer();
      this.paymentModal = 'processing';
      this.initializeWebSocket(prevSessionId);
    }
  }

  configureForm() {
    this.messageForm = this.fb.group({
      subject: [{ value: null }, Validators.required],
      message: [null, [Validators.required]],
      mobileOperator: [null, [Validators.required]],
      phoneNumber: [null, [Validators.required]],
      ownerName: [null, [Validators.required]],
      referralSource: [null],
      referralMedium: [null],
      referralCampaign: [null],
    })
  }
  get operatorControl() {
    return this.messageForm.get('mobileOperator') as FormControl;
  }
  get sourceControl() {
    return this.messageForm.get('referralSource') as FormControl;
  }
  get mediumControl() {
    return this.messageForm.get('referralMedium') as FormControl;
  }
  get campaignControl() {
    return this.messageForm.get('referralCampaign') as FormControl;
  }

  onPhoneCountryChange(iso2: string) {
    if (!iso2 || !this.handleInfo?.paymentCountries) return;
    const match = this.handleInfo.paymentCountries.find(
      (c: FanCountry) => getAlpha2Code(c.countryCode).toLowerCase() === iso2.toLowerCase()
    );
    this.selectedCountry = match || null;
    this.selectedCountry?.operators.map((operator) => {
      operator.disabled = operator.status === PROVIDERS_STATUS.DELAYED;
    });
    if (!this.predictionInProgress) {
      this.operatorControl.setValue(null);
    }
  }

  subOperatorControl() {
    this.subArr.push(
      this.operatorControl.valueChanges.subscribe((res: string) => {
        if (res) {
          this.selectedOperator = this.selectedCountry?.operators.find((operator: FanOperator) => operator.name === res) || null;
          this.parsePaymentArr();
        } else {
          this.selectedAmount = 0;
          this.paymentAmounts = [];
        }
      })
    )
  }

  subPhoneNumberControl() {
    this.subArr.push(
      this.phoneNumberControl.valueChanges.pipe(
        debounceTime(800),
        distinctUntilChanged(),
        filter(() => this.phoneNumberControl.valid),
      ).subscribe((phoneNumber: string) => {
        this.callPredictProvider(phoneNumber);
      })
    );
  }

  private callPredictProvider(phoneNumber: string) {
    this.predictSubscription?.unsubscribe();
    this.isPredicting = true;

    this.predictSubscription = this.pawapayService.predictProvider(phoneNumber).subscribe({
      next: (prediction) => {
        this.isPredicting = false;
        this.applyPrediction(prediction);
      },
      error: () => {
        this.isPredicting = false;
      }
    });
    this.subArr.push(this.predictSubscription);
  }

  private applyPrediction(prediction: PredictProviderResponse) {
    if (!this.handleInfo?.paymentCountries) return;

    const matchingCountry = this.handleInfo.paymentCountries.find(
      (c: FanCountry) => c.countryCode === prediction.country
    );
    if (!matchingCountry) return;

    const matchingOperator = matchingCountry.operators.find(
      (op: FanOperator) => op.name === prediction.provider
    );
    if (!matchingOperator) return;

    const iso2 = getAlpha2Code(prediction.country).toLowerCase();
    this.predictionInProgress = true;
    this.predictedCountryIso2 = prediction.country; // alpha-3 for [countryCode] input
    this.onPhoneCountryChange(iso2);
    this.operatorControl.setValue(prediction.provider);
    this.predictionInProgress = false;
  }

  /**
  * parse the payment array according to the currency and
  * exchange rate of the selected country
  */
  parsePaymentArr() {
    this.paymentAmounts = [];
    if (this.selectedOperator) {
      this.multiples.forEach(multiple => {
        if (this.selectedOperator) {
          this.paymentAmounts.push(this.selectedOperator.price * multiple);
        }
      });

    }
    this.selectedAmount = this.paymentAmounts?.[0] || 0;
  }

  get mobileOperatorControl() {
    return this.messageForm.get('mobileOperator') as FormControl;
  }
  get phoneNumberControl() {
    return this.messageForm.get('phoneNumber') as FormControl;
  }
  get ownerNameControl() {
    return this.messageForm.get('ownerName') as FormControl;
  }
  get subjectControl() {
    return this.messageForm.get('subject') as FormControl;
  }
  get messageControl() {
    return this.messageForm.get('message') as FormControl;
  }

  get formattedDescription(): string {
    return this.handleInfo?.youtubeEmbed?.description.replace(/\n/g, '<br>') || '';
  }

  get videoId(): string | null {
    const embedUrl = this.handleInfo?.youtubeEmbed?.embedUrl;
    if (!embedUrl) return null;
    const match = embedUrl.match(/embed\/([^?/]+)/);
    return match ? match[1] : null;
  }

  private buildSupportedCountryIso2(): string[] {
    return (this.handleInfo?.paymentCountries || [])
      .map((c: FanCountry) => getAlpha2Code(c.countryCode).toLowerCase())
      .filter(Boolean);
  }

  reset() {
    this.messageForm.reset();
    this.subjectControl.setValue(this.videoTitle);
    this.selectedCountry = null;
    this.selectedOperator = null;
    this.predictedCountryIso2 = null;
    this.paymentAmounts = [];
    this.selectedAmount = 0;
  }

  toggleDescription() {
    this.isDescriptionExpanded = !this.isDescriptionExpanded;
  }

  getChannelInfo() {
    this.subArr.push(
      this.fanService.getChannelInformationForFans(this.handle, this.referral ?? undefined).subscribe({
        next: async (res: FanChannelInfo) => {
          if (!this.paymentModal) {
            this.checkPrevSession();
          }

          this.handleInfo = res;
          this.isLoading = false;
          const rawTitle = this.handleInfo?.youtubeEmbed?.title ?? '';
          const decodedTitle = this.decodeHtmlEntities(rawTitle);
          this.defaultSubject = decodedTitle;
          this.subjectControl.setValue(decodedTitle);
          this.videoTitle = decodedTitle;
          this.cachedSupportedCountryIso2 = this.buildSupportedCountryIso2();

          if (this.handleInfo.youtubeEmbed) {
            const embedUrl = this.handleInfo.youtubeEmbed.embedUrl;
            this.youtubeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
          }
          this.handleInfo.qr = await generateQR(res.inviteLink);
        },
        error: () => {
          this.isLoading = false;
          this.router.navigateByUrl('/');
        }
      })
    )
  }

  private getOrCreateIdempotencyKey(): string {
    if (!this.currentIdempotencyKey) {
      this.currentIdempotencyKey = crypto.randomUUID();
    }
    return this.currentIdempotencyKey;
  }

  async sendPayment() {
    if (!this.selectedCountry) {
      this.alertService.error('Error', 'Please select a country from the phone number flag');
      return;
    }
    if (this.messageForm.valid) {
      const selectedMultiple = this.getSelectedMultiple();
      if (!selectedMultiple) {
        this.alertService.error('Error', 'Something went wrong! Please again enter values');
        return;
      }
      const formValues = this.messageForm.value;
      const body: SendFanPaymentBody = {
        idempotencyKey: this.getOrCreateIdempotencyKey(),
        subject: formValues.subject,
        messageContent: formValues.message,
        payerFullName: formValues.ownerName,
        payerPhone: formValues?.phoneNumber,
        priceMultiple: selectedMultiple,
        currency: this.selectedCountry?.currency,
        correspondent: formValues.mobileOperator,
        referralSource: formValues.referralSource,
        referralMedium: formValues.referralMedium,
        referralCampaign: formValues.referralCampaign,
        ...(this.handleInfo.youtubeEmbed ? {
          messageType: this.handleInfo.youtubeEmbed.isLiveStream ? FAN_MESSAGE_TYPE.LIVESTREAM : FAN_MESSAGE_TYPE.VIDEO,
          youtubeUrl: this.handleInfo.youtubeEmbed.embedUrl,
        } : {}),
      }
      //get chat id for the live stream and add it in the body
      //omitting it in case chat id is not retrieved
      if (this.handleInfo.youtubeEmbed?.isLiveStream) {
        const liveChatId = await this.getLiveChatId();
        if (liveChatId) {
          body.youtubeLiveChatId = liveChatId;
        }
      }
      this.subArr.push(
        this.fanService.fanPayment(this.handle, body).subscribe({
          next: (res: FanPayment) => {
            this.currentIdempotencyKey = null;
            this.paymentModal = 'processing';
            this.paymentInitResponse = res;
            this.initializeWebSocket();
            localStorage.setItem(LocalVars.transSessionId, res.fanSessionId);
            localStorage.setItem(LocalVars.transStartTime, new Date().toISOString());
            this.startTransTimer();
          },
          error: (err: { status?: number }) => {
            // Clear key on 4xx (user will fix input, new intent)
            // Preserve key on 5xx/network error (retry should deduplicate)
            if (err?.status && err.status >= 400 && err.status < 500) {
              this.currentIdempotencyKey = null;
            }
            this.paymentModal = null;
          }
        })
      )
    } else {
      this.messageForm.markAllAsTouched();
    }
  }


  async getLiveChatId() {
    if (!this.handleInfo.youtubeEmbed) return null;
    const res = await this.fanService.getYoutubeVideoData(this.handleInfo.youtubeEmbed.embedUrl)
    return res?.items?.[0]?.liveStreamingDetails?.activeLiveChatId || null;
  }

  // formatPhoneNumber(number: string): string {
  //   if (number.startsWith('+')) {
  //     return number;
  //   }
  //   return `+${number}`;
  // }

  getSelectedMultiple(): number | null {
    if (this.selectedOperator) {
      const price = this.selectedOperator?.price
      if (this.selectedAmount % price !== 0) {
        return 0;
      }
      const multiple = this.selectedAmount / price;
      if (multiple > this.selectedOperator.maxMultiple) {
        return null;
      }
      return multiple;
    } else {
      return null;
    }
  }


  /**
 * Initialize WebSocket connection for real-time payment events
 */
  private async initializeWebSocket(fanSessionId?: string) {
    try {
      // Connect to WebSocket
      this.socket = io(`${environment.API_BASE}/fan`, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      // Connection handlers
      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        // Send auth message
        this.socket?.emit('joinFanRoom', fanSessionId || this.paymentInitResponse.fanSessionId);
      });

      this.socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
      });

      // Payment request sent to PawaPay
      this.socket.on('payment_initiated', (data: string) => {
        console.log('Payment initiated:', data);
        this.paymentModal = 'processing';
      });
      // Payment status update
      this.socket.on('paymentStatus', (data: { channelHandle: string; timestamp: string; status: string }) => {
        console.log('Payment status received:', data);
        switch (data.status) {
          case 'succeeded': {
            const newComment: RecentComment = {
              payerFullName: this.messageForm.get('ownerName')?.value || 'You',
              content: this.messageForm.get('message')?.value || '',
              timestamp: new Date().toISOString(),
              senderType: 'paid',
              isNew: true,
            };
            if (this.handleInfo?.recentMessages) {
              this.handleInfo.recentMessages.unshift(newComment);
            }
            this.paymentModal = 'success'
            break;
          }
          case 'failed':
            this.paymentModal = 'failed'
            break;
          case 'canceled':
            this.paymentModal = 'failed'
            break;
          case 'refunded':
            this.paymentModal = 'refunded'
            break;
          default:
            break;
        }
        this.clearTransTimer();
        this.removeLocalTransData();
        this.disconnectWebSocket();
      });
      // Message delivered
      this.socket.on('messageDelivery', (data: { channelHandle: string; timestamp: string; status: string }) => {
        console.log('message received:', data);
        this.paymentModal = 'message_received';
        this.getChannelInfo();
      });

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }

  startTransTimer() {
    const start = localStorage.getItem(LocalVars.transStartTime) || undefined;
    if (start) {
      const startTime = start ? new Date(start).getTime() : new Date().getTime();
      const TIMEOUT = 10 * 60 * 1000; // 10 minutes in ms

      // Clear existing timer (important)
      if (this.transTimer) {
        clearInterval(this.transTimer);
      }

      this.transTimer = setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTime;
        this.remainingSeconds = Math.max(0, Math.ceil((TIMEOUT - elapsed) / 1000));

        if (elapsed >= TIMEOUT) {
          this.paymentModal = 'timed_out';
          this.removeLocalTransData();
          this.disconnectWebSocket();
          clearInterval(this.transTimer);
        }

      }, 1000);
    }
  }

  clearTransTimer() {
    if (this.transTimer) {
      clearInterval(this.transTimer);
    }
  }

  removeLocalTransData() {
    localStorage.removeItem(LocalVars.transSessionId);
    localStorage.removeItem(LocalVars.transStartTime);
  }

  /**
   * Disconnect WebSocket
   */
  private disconnectWebSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Decode HTML entities (e.g. &#39; → ') from YouTube API responses.
   * Uses a DOMParser to safely parse entities without executing scripts.
   */
  private decodeHtmlEntities(text: string): string {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    return doc.documentElement.textContent || text;
  }

  openTelegram(inviteLink: string) {
    window.open(inviteLink, '_blank');
  }

  onRetryWithDifferentNumber(): void {
    this.clearTransTimer();
    this.disconnectWebSocket();
    this.removeLocalTransData();
    this.currentIdempotencyKey = null;
    this.paymentModal = null;
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('padding-right');
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
  }

  onModelClose(event: boolean) {
    if (event) {
      const wasSuccess = this.paymentModal === 'success';
      if (wasSuccess) {
        this.reset();
      }
      this.currentIdempotencyKey = null;
      this.paymentModal = null;
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('padding-right');
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      if (wasSuccess) {
        setTimeout(() => this.scrollToTelegramSection(), 100);
      }
    }
  }

  private scrollToTelegramSection() {
    const el = this.telegramBlock?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const viewHeight = window.innerHeight || document.documentElement.clientHeight;
    const fullyVisible = rect.top >= 0 && rect.bottom <= viewHeight;
    if (fullyVisible) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
