import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ZohoSalesIQService {
  private document = inject<Document>(DOCUMENT);

  private isLoaded = false;

  /**
   * Initialize Zoho SalesIQ tracking
   * This method loads the tracking scripts and initializes the service
   */
  initializeTracking(): Promise<void> {
    return new Promise((resolve) => {
      // Check if Zoho is enabled in environment
      if (!environment.zoho.enabled) {
        console.log('Zoho SalesIQ: Tracking disabled in this environment');
        resolve();
        return;
      }

      // Check if already loaded
      if (this.isLoaded) {
        console.log('Zoho SalesIQ: Already initialized');
        resolve();
        return;
      }

      try {
        console.log('Zoho SalesIQ: Initializing tracking...');
        
        // Step 1: Initialize Zoho SalesIQ object
        this.injectInitializationScript();

        // Step 2: Load the main tracking script
        this.loadTrackingScript()
          .then(() => {
            this.isLoaded = true;
            console.log('Zoho SalesIQ: Tracking initialized successfully');
            resolve();
          })
          .catch((error) => {
            console.error('Zoho SalesIQ: Failed to load tracking script:', error);
            resolve();
          });

      } catch (error) {
        console.error('Zoho SalesIQ: Error during initialization:', error);
        resolve();
      }
    });
  }

  /**
   * Check if Zoho SalesIQ is loaded and ready
   */
  isReady(): boolean {
    return this.isLoaded && environment.zoho.enabled;
  }

  /**
   * Inject the initialization script that sets up the Zoho SalesIQ object
   */
  private injectInitializationScript(): void {
    const initScript = this.document.createElement('script');
    initScript.type = 'text/javascript';
    initScript.innerHTML = `
      window.$zoho = window.$zoho || {};
      $zoho.salesiq = $zoho.salesiq || {ready: function(){}};
    `;
    
    // Insert at the beginning of head
    const head = this.document.getElementsByTagName('head')[0];
    head.insertBefore(initScript, head.firstChild);
    console.log('Zoho SalesIQ: Initialization script injected');
  }

  /**
   * Load the main Zoho SalesIQ tracking script
   */
  private loadTrackingScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = this.document.createElement('script');
      script.id = 'zsiqscript';
      script.src = `https://salesiq.zohopublic.com/widget?wc=${environment.zoho.widgetCode}`;
      script.defer = true;

      script.onload = () => {
        console.log('Zoho SalesIQ: Tracking script loaded successfully');
        resolve();
      };

      script.onerror = (error) => {
        console.error('Zoho SalesIQ: Script loading failed');
        reject(error);
      };

      // Append to head
      this.document.head.appendChild(script);
      console.log('Zoho SalesIQ: Tracking script added to DOM');
    });
  }
}
