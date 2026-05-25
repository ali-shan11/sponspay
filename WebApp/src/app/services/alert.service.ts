import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AlertLinks, AlertMessage, AlertMessageType, ApiError } from '@app-types/alerts';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private alertMessages: AlertMessage[] = [];
  private alertSubject = new BehaviorSubject<AlertMessage[]>([]);

  alert$ = this.alertSubject.asObservable();

  // -----------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------
  error(title: string, message: string, links?: AlertLinks[]): void {
    this.show(title, message, 'error', links);
  }
  success(title: string, message: string, links?: AlertLinks[]): void {
    this.show(title, message, 'success', links);
  }
  info(title: string, message: string, links?: AlertLinks[]): void {
    this.show(title, message, 'info', links);
  }

  // -----------------------------------------------------------------
  // Private helper – adds the alert with a unique ID
  // -----------------------------------------------------------------
  private idCounter = 0;
  private show(title: string, message: string, type: AlertMessageType, links?: AlertLinks[]): void {
    const id = `${Date.now()}-${this.idCounter++}`;
    // Optional: prevent duplicate identical alerts
    const exists = this.alertMessages.some(
      a => a.title === title && a.message === message && a.type === type
    );
    if (exists) return;

    if (this.alertMessages.length >= 5) {
      this.alertMessages.shift();
    }

    this.alertMessages.push({ id, title, message, type, links });
    this.alertSubject.next([...this.alertMessages]);
  }

  // -----------------------------------------------------------------
  // Remove by ID
  // -----------------------------------------------------------------
  removeById(id: string): void {
    this.alertMessages = this.alertMessages.filter(a => a.id !== id);
    this.alertSubject.next([...this.alertMessages]);
  }

  clear(): void {
    this.alertMessages = [];
    this.alertSubject.next([]);
  }

  apiError(err: HttpErrorResponse){
    const error = err.error as ApiError;
    this.error(error?.error||'Error', error?.message||'Some error occurred');
  }
}
