import { Injectable, inject } from '@angular/core';
import { environment } from './../../../environments/environment';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { APP_ENDPOINTS } from '@utils/urls';

export interface ContactUs {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  message: string;
  interest: string;
  country: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContactUsService {
  private http = inject(HttpClient);

  contactUs(formData: ContactUs): Observable<void> {
    return this.http.post<void>(environment.API_BASE + APP_ENDPOINTS.CONTACT_US, formData);
  }
  
}
