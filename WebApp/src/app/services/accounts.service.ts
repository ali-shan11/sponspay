import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CUSTOM_REQUEST_CONTEXT } from '../auth/interceptor/http-context.tokens';
import { UniqueCountry } from '@app-types/accounts';
import { environment } from '../../environments/environment';
import { APP_ENDPOINTS } from '@utils/urls';

@Injectable({
  providedIn: 'root'
})
export class AccountsService {
  private BASE_URL = environment.API_BASE;
  private http = inject(HttpClient);

  public loaderContext = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, {
    showLoader:true
  });

  getCountriesList(): Observable<UniqueCountry[]> {
    return this.http.get<UniqueCountry[]>(this.BASE_URL + APP_ENDPOINTS.COUNTRIES_LIST);
  }
}
