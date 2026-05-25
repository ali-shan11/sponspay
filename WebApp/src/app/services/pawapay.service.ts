import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CUSTOM_REQUEST_CONTEXT } from '../auth/interceptor/http-context.tokens';
import { PredictProviderResponse } from '@app-types/fan';
import { APP_ENDPOINTS } from '@utils/urls';

@Injectable({
  providedIn: 'root'
})
export class PawapayService {
  private http = inject(HttpClient);

  public loaderContext = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, {
    showLoader: true
  });

  private silentContext = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, {
    showLoader: false,
    skipAlert: true,
  });

  predictProvider(phoneNumber: string): Observable<PredictProviderResponse> {
    return this.http.post<PredictProviderResponse>(
      environment.API_BASE + APP_ENDPOINTS.PAWAPAY_PREDICT_PROVIDER,
      { phoneNumber },
      { context: this.silentContext },
    );
  }
}
