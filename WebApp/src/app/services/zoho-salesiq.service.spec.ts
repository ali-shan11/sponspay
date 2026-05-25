import { DOCUMENT } from '@angular/common';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { ZohoSalesIQService } from './zoho-salesiq.service';
import { environment } from '../../environments/environment';

describe('ZohoSalesIQService', () => {
  let service: ZohoSalesIQService;
  let mockDocument: jasmine.SpyObj<Document>;
  let mockHead: jasmine.SpyObj<HTMLHeadElement>;
  let mockScript: jasmine.SpyObj<HTMLScriptElement>;
  let originalEnvironment: any;

  beforeEach(() => {
    // Store original environment for restoration
    originalEnvironment = { ...environment };

    // Create mock script element with writable properties
    mockScript = {
      onload: null,
      onerror: null,
      src: '',
      id: '',
      defer: false,
      type: '',
      innerHTML: ''
    } as any;

    // Create mock head element
    mockHead = jasmine.createSpyObj('HTMLHeadElement', ['appendChild', 'insertBefore'], {
      firstChild: null
    });

    // Create mock document
    mockDocument = jasmine.createSpyObj('Document', ['createElement', 'getElementsByTagName'], {
      head: mockHead
    });

    TestBed.configureTestingModule({
      providers: [
        ZohoSalesIQService,
        { provide: DOCUMENT, useValue: mockDocument }
      ]
    });

    service = TestBed.inject(ZohoSalesIQService);

    // Setup default DOM mocking behavior
    mockDocument.createElement.and.returnValue(mockScript);
    mockDocument.getElementsByTagName.and.returnValue([mockHead] as any);
  });

  afterEach(() => {
    // Restore original environment
    Object.assign(environment, originalEnvironment);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with isLoaded as false', () => {
      expect(service.isReady()).toBe(false);
    });
  });

  describe('initializeTracking() - Environment Configuration', () => {
    it('should resolve when Zoho is disabled in environment', async () => {
      // Arrange
      environment.zoho.enabled = false;
      spyOn(console, 'log');

      // Act & Assert
      await expectAsync(service.initializeTracking()).toBeResolved();
      expect(console.log).toHaveBeenCalledWith('Zoho SalesIQ: Tracking disabled in this environment');
    });

    it('should proceed with initialization when Zoho is enabled', fakeAsync(() => {
      // Arrange
      environment.zoho.enabled = true;
      environment.zoho.widgetCode = 'test-widget-code';
      spyOn(console, 'log');

      // Simulate successful script loading
      mockDocument.createElement.and.callFake((tagName: string) => {
        if (tagName === 'script') {
          setTimeout(() => {
            if (mockScript.onload) {
              mockScript.onload({} as Event);
            }
          }, 0);
        }
        return mockScript;
      });

      // Act
      service.initializeTracking();
      tick(); // Process setTimeout

      // Assert
      expect(console.log).toHaveBeenCalledWith('Zoho SalesIQ: Initializing tracking...');
      expect(console.log).toHaveBeenCalledWith('Zoho SalesIQ: Tracking initialized successfully');
    }));

    it('should resolve immediately if already loaded', fakeAsync(() => {
      // Arrange
      environment.zoho.enabled = true;
      spyOn(console, 'log');

      // First initialization
      mockDocument.createElement.and.callFake(() => {
        setTimeout(() => {
          if (mockScript.onload) {
            mockScript.onload({} as Event);
          }
        }, 0);
        return mockScript;
      });

      service.initializeTracking();
      tick(); // Process first initialization

      // Reset spies for second call
      (mockDocument.createElement as jasmine.Spy).calls.reset();
      (console.log as jasmine.Spy).calls.reset();

      // Act - Second initialization
      service.initializeTracking();
      tick(); // Process second initialization

      // Assert
      expect(console.log).toHaveBeenCalledWith('Zoho SalesIQ: Already initialized');
      expect(mockDocument.createElement).not.toHaveBeenCalled();
    }));
  });

  describe('initializeTracking() - Script Injection', () => {
    beforeEach(() => {
      environment.zoho.enabled = true;
      environment.zoho.widgetCode = 'test-widget-123';
    });

    it('should inject initialization script correctly', fakeAsync(() => {
      // Arrange
      spyOn(console, 'log');
      let initScript: HTMLScriptElement | undefined;

      mockDocument.createElement.and.callFake(() => {
        const script = {
          onload: null,
          onerror: null,
          src: '',
          id: '',
          defer: false,
          type: '',
          innerHTML: ''
        } as any;

        // Track which script is being created
        if (!initScript) {
          initScript = script;
        } else {
          // Simulate successful loading for tracking script
          setTimeout(() => {
            if (script.onload) {
              script.onload({} as Event);
            }
          }, 0);
        }

        return script;
      });

      // Act
      service.initializeTracking();
      tick(); // Process setTimeout

      // Assert
      expect(mockDocument.createElement).toHaveBeenCalledWith('script');
      expect(initScript!.type).toBe('text/javascript');
      expect(initScript!.innerHTML).toContain('window.$zoho = window.$zoho || {}');
      expect(initScript!.innerHTML).toContain('$zoho.salesiq = $zoho.salesiq || {ready: function(){}}');
      expect(mockHead.insertBefore).toHaveBeenCalledWith(initScript!, mockHead.firstChild);
      expect(console.log).toHaveBeenCalledWith('Zoho SalesIQ: Initialization script injected');
    }));

    it('should load tracking script with correct attributes', fakeAsync(() => {
      // Arrange
      spyOn(console, 'log');
      let trackingScript: HTMLScriptElement | undefined;

      mockDocument.createElement.and.callFake(() => {
        const script = {
          onload: null,
          onerror: null,
          src: '',
          id: '',
          defer: false,
          type: '',
          innerHTML: ''
        } as any;

        // Second script is the tracking script
        if (mockDocument.createElement.calls.count() === 2) {
          trackingScript = script;
          setTimeout(() => {
            if (script.onload) {
              script.onload({} as Event);
            }
          }, 0);
        }

        return script;
      });

      // Act
      service.initializeTracking();
      tick(); // Process setTimeout

      // Assert
      expect(trackingScript!.id).toBe('zsiqscript');
      expect(trackingScript!.src).toBe('https://salesiq.zohopublic.com/widget?wc=test-widget-123');
      expect(trackingScript!.defer).toBe(true);
      expect(mockHead.appendChild).toHaveBeenCalledWith(trackingScript!);
      expect(console.log).toHaveBeenCalledWith('Zoho SalesIQ: Tracking script added to DOM');
    }));

    it('should handle successful script loading', fakeAsync(() => {
      // Arrange
      spyOn(console, 'log');

      mockDocument.createElement.and.callFake(() => {
        setTimeout(() => {
          if (mockScript.onload) {
            mockScript.onload({} as Event);
          }
        }, 0);
        return mockScript;
      });

      // Act
      service.initializeTracking();
      tick(); // Process setTimeout

      // Assert
      expect(console.log).toHaveBeenCalledWith('Zoho SalesIQ: Tracking script loaded successfully');
      expect(service.isReady()).toBe(true);
    }));

    it('should handle script loading errors gracefully', fakeAsync(() => {
      // Arrange
      spyOn(console, 'error');

      mockDocument.createElement.and.callFake(() => {
        setTimeout(() => {
          if (mockScript.onerror) {
            mockScript.onerror({} as Event);
          }
        }, 0);
        return mockScript;
      });

      // Act & Assert
      let resolved = false;
      service.initializeTracking().then(() => resolved = true);
      tick(); // Process setTimeout

      expect(resolved).toBe(true);
      expect(console.error).toHaveBeenCalledWith('Zoho SalesIQ: Script loading failed');
      expect(console.error).toHaveBeenCalledWith('Zoho SalesIQ: Failed to load tracking script:', jasmine.any(Object));
    }));
  });

  describe('initializeTracking() - Error Handling', () => {
    beforeEach(() => {
      environment.zoho.enabled = true;
    });

    it('should handle DOM manipulation errors gracefully', async () => {
      // Arrange
      spyOn(console, 'error');
      const domError = new Error('DOM manipulation failed');
      mockDocument.createElement.and.throwError(domError);

      // Act & Assert
      await expectAsync(service.initializeTracking()).toBeResolved();
      expect(console.error).toHaveBeenCalledWith('Zoho SalesIQ: Error during initialization:', domError);
    });

    it('should handle errors during script injection gracefully', async () => {
      // Arrange
      spyOn(console, 'error');
      const injectionError = new Error('Script injection failed');
      mockHead.insertBefore.and.throwError(injectionError);

      // Act & Assert
      await expectAsync(service.initializeTracking()).toBeResolved();
      expect(console.error).toHaveBeenCalledWith('Zoho SalesIQ: Error during initialization:', injectionError);
    });

    it('should handle errors during tracking script loading setup gracefully', async () => {
      // Arrange
      spyOn(console, 'error');
      const setupError = new Error('Script setup failed');

      // First createElement call succeeds (init script), second fails (tracking script)
      let callCount = 0;
      mockDocument.createElement.and.callFake(() => {
        callCount++;
        if (callCount === 1) {
          return mockScript; // Init script succeeds
        } else {
          throw setupError; // Tracking script fails
        }
      });

      // Act & Assert
      await expectAsync(service.initializeTracking()).toBeResolved();
      expect(console.error).toHaveBeenCalledWith('Zoho SalesIQ: Failed to load tracking script:', setupError);
    });
  });

  describe('isReady()', () => {
    it('should return false when Zoho is disabled', () => {
      // Arrange
      environment.zoho.enabled = false;

      // Act & Assert
      expect(service.isReady()).toBe(false);
    });

    it('should return false when not loaded even if enabled', () => {
      // Arrange
      environment.zoho.enabled = true;

      // Act & Assert
      expect(service.isReady()).toBe(false);
    });

    it('should return true when loaded and enabled', fakeAsync(() => {
      // Arrange
      environment.zoho.enabled = true;
      mockDocument.createElement.and.callFake(() => {
        setTimeout(() => {
          if (mockScript.onload) {
            mockScript.onload({} as Event);
          }
        }, 0);
        return mockScript;
      });

      // Act
      service.initializeTracking();
      tick(); // Process setTimeout

      // Assert
      expect(service.isReady()).toBe(true);
    }));

    it('should return false after failed initialization', fakeAsync(() => {
      // Arrange
      environment.zoho.enabled = true;
      mockDocument.createElement.and.callFake(() => {
        setTimeout(() => {
          if (mockScript.onerror) {
            mockScript.onerror({} as Event);
          }
        }, 0);
        return mockScript;
      });

      // Act
      let resolved = false;
      service.initializeTracking().then(() => resolved = true);
      tick(); // Process setTimeout

      // Assert
      expect(resolved).toBe(true);
      expect(service.isReady()).toBe(false);
    }));
  });

  describe('DOM Integration', () => {
    beforeEach(() => {
      environment.zoho.enabled = true;
      environment.zoho.widgetCode = 'test-widget-code';
    });

    it('should create script elements with correct tag name', fakeAsync(() => {
      // Arrange
      mockDocument.createElement.and.callFake(() => {
        setTimeout(() => {
          if (mockScript.onload) {
            mockScript.onload({} as Event);
          }
        }, 0);
        return mockScript;
      });

      // Act
      service.initializeTracking();
      tick(); // Process setTimeout

      // Assert
      expect(mockDocument.createElement).toHaveBeenCalledWith('script');
      expect(mockDocument.createElement).toHaveBeenCalledTimes(2); // Init + tracking scripts
    }));

    it('should get head element correctly', fakeAsync(() => {
      // Arrange
      mockDocument.createElement.and.callFake(() => {
        setTimeout(() => {
          if (mockScript.onload) {
            mockScript.onload({} as Event);
          }
        }, 0);
        return mockScript;
      });

      // Act
      service.initializeTracking();
      tick(); // Process setTimeout

      // Assert
      expect(mockDocument.getElementsByTagName).toHaveBeenCalledWith('head');
    }));

    it('should handle missing head element gracefully', async () => {
      // Arrange
      spyOn(console, 'error');
      mockDocument.getElementsByTagName.and.returnValue([] as any);

      // Act & Assert
      await expectAsync(service.initializeTracking()).toBeResolved();
      expect(console.error).toHaveBeenCalledWith(
        'Zoho SalesIQ: Error during initialization:',
        jasmine.any(Error)
      );
    });
  });

  describe('Logging and Console Output', () => {
    it('should log appropriate messages during successful initialization', fakeAsync(() => {
      // Arrange
      environment.zoho.enabled = true;
      spyOn(console, 'log');
      
      mockDocument.createElement.and.callFake(() => {
        setTimeout(() => {
          if (mockScript.onload) {
            mockScript.onload({} as Event);
          }
        }, 0);
        return mockScript;
      });

      // Act
      service.initializeTracking();
      tick(); // Process setTimeout

      // Assert
      expect(console.log).toHaveBeenCalledWith('Zoho SalesIQ: Initializing tracking...');
      expect(console.log).toHaveBeenCalledWith('Zoho SalesIQ: Initialization script injected');
      expect(console.log).toHaveBeenCalledWith('Zoho SalesIQ: Tracking script added to DOM');
      expect(console.log).toHaveBeenCalledWith('Zoho SalesIQ: Tracking script loaded successfully');
      expect(console.log).toHaveBeenCalledWith('Zoho SalesIQ: Tracking initialized successfully');
    }));

    it('should log error messages during failed initialization', fakeAsync(() => {
      // Arrange
      environment.zoho.enabled = true;
      spyOn(console, 'error');

      mockDocument.createElement.and.callFake(() => {
        setTimeout(() => {
          if (mockScript.onerror) {
            mockScript.onerror({} as Event);
          }
        }, 0);
        return mockScript;
      });

      // Act
      let resolved = false;
      service.initializeTracking().then(() => resolved = true);
      tick(); // Process setTimeout

      // Assert
      expect(resolved).toBe(true);
      expect(console.error).toHaveBeenCalledWith('Zoho SalesIQ: Script loading failed');
      expect(console.error).toHaveBeenCalledWith('Zoho SalesIQ: Failed to load tracking script:', jasmine.any(Object));
    }));

    it('should log disabled state message', async () => {
      // Arrange
      environment.zoho.enabled = false;
      spyOn(console, 'log');

      // Act & Assert
      await expectAsync(service.initializeTracking()).toBeResolved();
      expect(console.log).toHaveBeenCalledWith('Zoho SalesIQ: Tracking disabled in this environment');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty widget code', async () => {
      // Arrange
      environment.zoho.enabled = true;
      environment.zoho.widgetCode = '';
      
      mockDocument.createElement.and.callFake(() => {
        setTimeout(() => {
          if (mockScript.onload) {
            mockScript.onload({} as Event);
          }
        }, 0);
        return mockScript;
      });

      // Act
      await service.initializeTracking();

      // Assert - Should still attempt to load with empty widget code
      expect(mockScript.src).toBe('https://salesiq.zohopublic.com/widget?wc=');
    });

    it('should handle multiple rapid initialization calls', fakeAsync(() => {
      // Arrange
      environment.zoho.enabled = true;
      spyOn(console, 'log');
      
      mockDocument.createElement.and.callFake(() => {
        setTimeout(() => {
          if (mockScript.onload) {
            mockScript.onload({} as Event);
          }
        }, 0);
        return mockScript;
      });

      // Act - Start multiple initializations simultaneously
      service.initializeTracking();
      service.initializeTracking();
      service.initializeTracking();

      tick(); // Process all setTimeout calls

      // Assert - All should start initialization since they're called before any complete
      expect(console.log).toHaveBeenCalledWith('Zoho SalesIQ: Initializing tracking...');
      expect(console.log).toHaveBeenCalledWith('Zoho SalesIQ: Tracking initialized successfully');
      
      // Now test that subsequent calls return "Already initialized"
      (console.log as jasmine.Spy).calls.reset();
      service.initializeTracking();
      tick();
      
      expect(console.log).toHaveBeenCalledWith('Zoho SalesIQ: Already initialized');
    }));

    it('should handle script element property assignment', async () => {
      // Arrange
      environment.zoho.enabled = true;
      environment.zoho.widgetCode = 'test-123';
      
      const actualScript = document.createElement('script');
      mockDocument.createElement.and.returnValue(actualScript);
      
      // Simulate successful loading
      setTimeout(() => {
        if (actualScript.onload) {
          actualScript.onload({} as Event);
        }
      }, 0);

      // Act
      await service.initializeTracking();

      // Assert - Check that properties were set correctly
      expect(actualScript.id).toBe('zsiqscript');
      expect(actualScript.src).toBe('https://salesiq.zohopublic.com/widget?wc=test-123');
      expect(actualScript.defer).toBe(true);
    });
  });
});
