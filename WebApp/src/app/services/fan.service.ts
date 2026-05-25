import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { FanChannelInfo, FanPayment, SendFanPaymentBody } from '@app-types/fan';
import { APP_ENDPOINTS } from '@utils/urls';
import { ReferralInfo } from '@utils/referrer.util';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CUSTOM_REQUEST_CONTEXT } from '../auth/interceptor/http-context.tokens';

@Injectable({
  providedIn: 'root'
})
export class FanService {
  private BASE_URL = environment.API_BASE;
  private http = inject(HttpClient);

  public loaderContext = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, {
    showLoader:true
  });

  getChannelInformationForFans(
    handle: string,
    referral?: ReferralInfo,
  ): Observable<FanChannelInfo> {
    let params = new HttpParams().set('limit', 10);
    if (referral?.referralSource) params = params.set('referralSource', referral.referralSource);
    if (referral?.referralMedium) params = params.set('referralMedium', referral.referralMedium);
    if (referral?.referralCampaign) params = params.set('referralCampaign', referral.referralCampaign);
    if (referral?.referrerUrl) params = params.set('referrer', referral.referrerUrl);
    if (referral?.referrerNetwork) params = params.set('network', referral.referrerNetwork);
    return this.http.get<FanChannelInfo>(this.BASE_URL+APP_ENDPOINTS.FAN+handle, {params, context:this.loaderContext});
  }

  fanPayment(handle:string, body:SendFanPaymentBody): Observable<FanPayment> {
    return this.http.post<FanPayment>(this.BASE_URL+APP_ENDPOINTS.FAN+handle+APP_ENDPOINTS.FAN_PAYMENT, body, {context:this.loaderContext});
  }

  async getYoutubeVideoData(videoUrl:string) {
    const videoId = this.getYouTubeVideoId(videoUrl);
    const youtube_access_token = localStorage.getItem('youtube_access_token');
    if (youtube_access_token) {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}`,
        {
          headers: { Authorization: `Bearer ${youtube_access_token}` }
        }
      );
      return response.json();
    }else{
      return null;
    }
  }

  getYouTubeVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:embed\/|watch\?v=|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }
  
}
