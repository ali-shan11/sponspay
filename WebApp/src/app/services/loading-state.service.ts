import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingStateService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);

    if (loading) {
      this.setError(null);
    }
  }

  setError(error: string | null): void {
    this.errorSubject.next(error);

    if (error) {
      this.setLoading(false);
    }
  }

  isLoading(): boolean {
    return this.loadingSubject.value;
  }

  getCurrentError(): string | null {
    return this.errorSubject.value;
  }

  clear(): void {
    this.setLoading(false);
    this.setError(null);
  }
}
