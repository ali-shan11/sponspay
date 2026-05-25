import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer } from '@angular/platform-browser';
import { of } from 'rxjs';

import { InlineSvgService } from './inline-svg.service';

describe('InlineSvgService', () => {
  let service: InlineSvgService;
  let mockHttpClient: jasmine.SpyObj<HttpClient>;
  let mockSanitizer: jasmine.SpyObj<DomSanitizer>;

  beforeEach(() => {
    mockHttpClient = jasmine.createSpyObj('HttpClient', ['get']);
    mockSanitizer = jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustHtml']);

    TestBed.configureTestingModule({
      providers: [
        InlineSvgService,
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: DomSanitizer, useValue: mockSanitizer },
      ]
    });

    service = TestBed.inject(InlineSvgService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getSvg', () => {
    it('should fetch SVG from the given path and sanitize it', (done: DoneFn) => {
      const svgContent = '<svg><circle r="10"/></svg>';
      const sanitizedHtml = '<svg><circle r="10"/></svg>' as any;
      mockHttpClient.get.and.returnValue(of(svgContent));
      mockSanitizer.bypassSecurityTrustHtml.and.returnValue(sanitizedHtml);

      service.getSvg('assets/icon.svg').subscribe(result => {
        expect(result).toBe(sanitizedHtml);
        expect(mockHttpClient.get).toHaveBeenCalledWith('assets/icon.svg', jasmine.objectContaining({ responseType: 'text' }) as any);
        expect(mockSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(svgContent);
        done();
      });
    });

    it('should cache the result and return the same observable for the same path', () => {
      const svgContent = '<svg></svg>';
      const sanitizedHtml = '<svg></svg>' as any;
      mockHttpClient.get.and.returnValue(of(svgContent));
      mockSanitizer.bypassSecurityTrustHtml.and.returnValue(sanitizedHtml);

      const first$ = service.getSvg('assets/icon.svg');
      const second$ = service.getSvg('assets/icon.svg');

      expect(first$).toBe(second$);
      // Should only call http.get once due to caching
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
    });

    it('should fetch different SVGs for different paths', () => {
      const svgContent1 = '<svg>1</svg>';
      const svgContent2 = '<svg>2</svg>';
      mockHttpClient.get.and.callFake(((path: string) => {
        return of(path === 'path1.svg' ? svgContent1 : svgContent2);
      }) as any);
      mockSanitizer.bypassSecurityTrustHtml.and.callFake(((html: string) => html) as any);

      const first$ = service.getSvg('path1.svg');
      const second$ = service.getSvg('path2.svg');

      expect(first$).not.toBe(second$);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });

    it('should use shareReplay so multiple subscribers get the same value', (done: DoneFn) => {
      const svgContent = '<svg>shared</svg>';
      const sanitizedHtml = '<svg>shared</svg>' as any;
      mockHttpClient.get.and.returnValue(of(svgContent));
      mockSanitizer.bypassSecurityTrustHtml.and.returnValue(sanitizedHtml);

      const svg$ = service.getSvg('shared.svg');

      let callCount = 0;
      svg$.subscribe(result => {
        callCount++;
        expect(result).toBe(sanitizedHtml);
      });
      svg$.subscribe(result => {
        callCount++;
        expect(result).toBe(sanitizedHtml);
        expect(callCount).toBe(2);
        // http.get should still only be called once due to shareReplay
        expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
        done();
      });
    });
  });
});
