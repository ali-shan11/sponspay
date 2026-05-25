import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoaderService {
  private requestCount = 0;
  private loaderSubject = new BehaviorSubject<boolean>(false);

  show(): void {
    this.requestCount++;
    if (this.requestCount === 1) {
      this.loaderSubject.next(true);
    }
    console.log('Loader shown – active requests:', this.requestCount);
  }

  hide(): void {
    this.requestCount = Math.max(0, this.requestCount - 1);
    if (this.requestCount === 0) {
      this.loaderSubject.next(false);
    }
    console.log('Loader hidden – active requests:', this.requestCount);
  }

  get loader(){
    return this.loaderSubject.asObservable();
  }
}