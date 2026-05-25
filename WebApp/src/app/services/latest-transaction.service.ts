import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { LatestTransactionResponse, MessageUnitStatistics, TransactionFilterParams } from '@app-types/transaction-activity';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DashboardService } from './dashboard.service';

@Injectable({
  providedIn: 'root'
})
export class LatestTransactionService {
  private dashboardService = inject(DashboardService);
  private BASE_URL = environment.API_BASE;
  private http = inject(HttpClient);

  getTransactionsList(params: TransactionFilterParams): Observable<LatestTransactionResponse> {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => {
            httpParams = httpParams.append(key, v.toString());
          });
        } else {
          httpParams = httpParams.set(key, value.toString());
        }
      }
    });

    return this.http.get<LatestTransactionResponse>(this.BASE_URL+'/creator-insights/transactions', {params: httpParams});
  }

  replyToMessage(messageId: string, text: string, channelId: string): Observable<{ success: boolean; revenueStatus: string }> {
    return this.http.post<{ success: boolean; revenueStatus: string }>(
      `${this.BASE_URL}/creator-insights/transactions/${messageId}/reply`,
      { text, channelId },
    );
  }

  getMessageStats(){
    const params = {channelId: this.dashboardService.selectedChannelObservable.value};
    return this.http.get<MessageUnitStatistics>(this.BASE_URL+'/creator-insights/message-unit-statistics', {params});
  }
}
