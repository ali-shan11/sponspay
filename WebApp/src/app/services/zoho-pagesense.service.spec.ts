import { DOCUMENT } from '@angular/common';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { ZohoPageSenseService } from './zoho-pagesense.service';
import { environment } from '../../environments/environment';

describe('ZohoPageSenseService', () => {
  let service: ZohoPageSenseService;
  let mockDocument: jasmine.SpyObj<Document>;
  let mockHead: jasmine.SpyObj<HTMLHeadElement>;
  let mockScript: any;
  let mockWindow: any;
  let originalEnvironment: any;

  beforeEach(() => {
    originalEnvironment = { ...environment, zoho: { ...environment.zoho } };

    mockScript = {
      onload: null,
      onerror: null,
      src: '',
      defer: false
    };

    mockHead = jasmine.createSpyObj('HTMLHeadElement', ['appendChild']);

    mockWindow = {};

    mockDocument = jasmine.createSpyObj('Document', ['createElement'], {
      head: mockHead,
      defaultView: mockWindow
    });

    TestBed.configureTestingModule({
      providers: [
        ZohoPageSenseService,
        { provide: DOCUMENT, useValue: mockDocument }
      ]
    });

    service = TestBed.inject(ZohoPageSenseService);

    mockDocument.createElement.and.returnValue(mockScript);
  });

  afterEach(() => {
    Object.assign(environment, originalEnvironment);
    environment.zoho = { ...originalEnvironment.zoho };
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('initializeTracking()', () => {
    it('should resolve when PageSense is disabled in environment', async () => {
      environment.zoho.pagesenseEnabled = false;
      spyOn(console, 'log');

      await expectAsync(service.initializeTracking()).toBeResolved();
      expect(console.log).toHaveBeenCalledWith('Zoho PageSense: Tracking disabled in this environment');
    });

    it('should load tracking script when enabled', fakeAsync(() => {
      environment.zoho.pagesenseEnabled = true;
      spyOn(console, 'log');

      mockDocument.createElement.and.callFake(() => {
        setTimeout(() => {
          if (mockScript.onload) {
            mockScript.onload({} as Event);
          }
        }, 0);
        return mockScript;
      });

      service.initializeTracking();
      tick();

      expect(console.log).toHaveBeenCalledWith('Zoho PageSense: Initializing tracking...');
      expect(console.log).toHaveBeenCalledWith('Zoho PageSense: Tracking initialized successfully');
    }));

    it('should resolve immediately if already loaded', fakeAsync(() => {
      environment.zoho.pagesenseEnabled = true;
      spyOn(console, 'log');

      mockDocument.createElement.and.callFake(() => {
        setTimeout(() => {
          if (mockScript.onload) {
            mockScript.onload({} as Event);
          }
        }, 0);
        return mockScript;
      });

      service.initializeTracking();
      tick();

      (mockDocument.createElement as jasmine.Spy).calls.reset();
      (console.log as jasmine.Spy).calls.reset();

      service.initializeTracking();
      tick();

      expect(console.log).toHaveBeenCalledWith('Zoho PageSense: Already initialized');
      expect(mockDocument.createElement).not.toHaveBeenCalled();
    }));

    it('should set correct script attributes', fakeAsync(() => {
      environment.zoho.pagesenseEnabled = true;

      mockDocument.createElement.and.callFake(() => {
        setTimeout(() => {
          if (mockScript.onload) {
            mockScript.onload({} as Event);
          }
        }, 0);
        return mockScript;
      });

      service.initializeTracking();
      tick();

      expect(mockScript.src).toBe('https://cdn.pagesense.io/js/sponspay/435cbe9039c24e418b0272ab0aaad3b3.js');
      expect(mockScript.defer).toBe(true);
      expect(mockHead.appendChild).toHaveBeenCalledWith(mockScript);
    }));

    it('should handle script loading errors gracefully', fakeAsync(() => {
      environment.zoho.pagesenseEnabled = true;
      spyOn(console, 'error');

      mockDocument.createElement.and.callFake(() => {
        setTimeout(() => {
          if (mockScript.onerror) {
            mockScript.onerror({} as Event);
          }
        }, 0);
        return mockScript;
      });

      let resolved = false;
      service.initializeTracking().then(() => resolved = true);
      tick();

      expect(resolved).toBe(true);
      expect(console.error).toHaveBeenCalledWith('Zoho PageSense: Script loading failed');
      expect(console.error).toHaveBeenCalledWith('Zoho PageSense: Failed to load tracking script:', jasmine.any(Object));
    }));

    it('should handle DOM manipulation errors gracefully', async () => {
      environment.zoho.pagesenseEnabled = true;
      spyOn(console, 'error');
      const domError = new Error('DOM error');
      mockDocument.createElement.and.throwError(domError);

      await expectAsync(service.initializeTracking()).toBeResolved();
      expect(console.error).toHaveBeenCalledWith('Zoho PageSense: Failed to load tracking script:', domError);
    });
  });

  describe('identifyUser()', () => {
    it('should not call pagesense when not loaded', () => {
      service.identifyUser('test@example.com');

      expect(mockWindow.pagesense).toBeUndefined();
    });

    it('should push identifyUser call when loaded', fakeAsync(() => {
      environment.zoho.pagesenseEnabled = true;
      spyOn(console, 'log');

      mockDocument.createElement.and.callFake(() => {
        setTimeout(() => {
          if (mockScript.onload) {
            mockScript.onload({} as Event);
          }
        }, 0);
        return mockScript;
      });

      service.initializeTracking();
      tick();

      service.identifyUser('test@example.com', { displayName: 'Test', uid: '123' });

      expect(mockWindow.pagesense).toEqual([
        ['identifyUser', 'test@example.com', { displayName: 'Test', uid: '123' }]
      ]);
      expect(console.log).toHaveBeenCalledWith('Zoho PageSense: User identified', 'test@example.com');
    }));

    it('should work without attributes', fakeAsync(() => {
      environment.zoho.pagesenseEnabled = true;

      mockDocument.createElement.and.callFake(() => {
        setTimeout(() => {
          if (mockScript.onload) {
            mockScript.onload({} as Event);
          }
        }, 0);
        return mockScript;
      });

      service.initializeTracking();
      tick();

      service.identifyUser('test@example.com');

      expect(mockWindow.pagesense).toEqual([
        ['identifyUser', 'test@example.com', undefined]
      ]);
    }));
  });

  describe('resetIdentity()', () => {
    it('should not call pagesense when not loaded', () => {
      service.resetIdentity();

      expect(mockWindow.pagesense).toBeUndefined();
    });

    it('should push resetIdentity call when loaded', fakeAsync(() => {
      environment.zoho.pagesenseEnabled = true;
      spyOn(console, 'log');

      mockDocument.createElement.and.callFake(() => {
        setTimeout(() => {
          if (mockScript.onload) {
            mockScript.onload({} as Event);
          }
        }, 0);
        return mockScript;
      });

      service.initializeTracking();
      tick();

      service.resetIdentity();

      expect(mockWindow.pagesense).toEqual([['resetIdentity']]);
      expect(console.log).toHaveBeenCalledWith('Zoho PageSense: Identity reset');
    }));
  });
});
