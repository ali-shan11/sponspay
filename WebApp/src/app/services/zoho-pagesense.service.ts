import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ZohoPageSenseService {
  private document = inject<Document>(DOCUMENT);

  private isLoaded = false;

  /**
   * Initialize Zoho PageSense tracking.
   * Injects the PageSense smartcode script into the document head.
   */
  initializeTracking(): Promise<void> {
    return new Promise((resolve) => {
      if (!environment.zoho.pagesenseEnabled) {
        console.log('Zoho PageSense: Tracking disabled in this environment');
        resolve();
        return;
      }

      if (this.isLoaded) {
        console.log('Zoho PageSense: Already initialized');
        resolve();
        return;
      }

      try {
        console.log('Zoho PageSense: Initializing tracking...');

        this.loadTrackingScript()
          .then(() => {
            this.isLoaded = true;
            console.log('Zoho PageSense: Tracking initialized successfully');
            resolve();
          })
          .catch((error) => {
            console.error('Zoho PageSense: Failed to load tracking script:', error);
            resolve();
          });
      } catch (error) {
        console.error('Zoho PageSense: Error during initialization:', error);
        resolve();
      }
    });
  }

  /**
   * Identify a logged-in user for session attribution.
   */
  identifyUser(email: string, attributes?: Record<string, string>): void {
    if (!this.isLoaded) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = this.document.defaultView as any;
    win.pagesense = win.pagesense || [];
    win.pagesense.push(['identifyUser', email, attributes]);
    console.log('Zoho PageSense: User identified', email);
  }

  /**
   * Reset identity on sign-out so the next session isn't mis-attributed.
   */
  resetIdentity(): void {
    if (!this.isLoaded) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = this.document.defaultView as any;
    win.pagesense = win.pagesense || [];
    win.pagesense.push(['resetIdentity']);
    console.log('Zoho PageSense: Identity reset');
  }

  /**
   * Load the Zoho PageSense tracking script from CDN.
   */
  private loadTrackingScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = this.document.createElement('script');
      script.src = 'https://cdn.pagesense.io/js/sponspay/435cbe9039c24e418b0272ab0aaad3b3.js';
      script.defer = true;

      script.onload = () => {
        console.log('Zoho PageSense: Tracking script loaded successfully');
        resolve();
      };

      script.onerror = (error) => {
        console.error('Zoho PageSense: Script loading failed');
        reject(error);
      };

      this.document.head.appendChild(script);
      console.log('Zoho PageSense: Tracking script added to DOM');
    });
  }
}
