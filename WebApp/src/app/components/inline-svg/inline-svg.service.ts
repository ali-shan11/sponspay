import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { map, shareReplay } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InlineSvgService {
  private cache = new Map<string, Observable<SafeHtml>>();

  public http = inject(HttpClient);
  public sanitizer = inject( DomSanitizer);

  getSvg(path: string): Observable<SafeHtml> {
    if (!this.cache.has(path)) {
      const svg$ = this.http.get(path, { responseType: 'text' }).pipe(
        map(svg => this.sanitizer.bypassSecurityTrustHtml(svg)),
        shareReplay(1)
      );
      this.cache.set(path, svg$);
    }
    return this.cache.get(path)!;
  }
}
