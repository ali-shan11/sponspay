import { Observable, of, throwError } from 'rxjs';
import { HttpHeaders, HttpParams, HttpResponse, HttpErrorResponse } from '@angular/common/http';

/**
 * HTTP request record for tracking and verification
 */
export interface HttpRequestRecord {
  method: string;
  url: string;
  body?: any;
  headers?: HttpHeaders;
  params?: HttpParams;
  timestamp: number;
}

/**
 * Mock HTTP response configuration
 */
export interface MockHttpResponse<T = any> {
  body: T;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
}

/**
 * Mock HTTP error configuration
 */
export interface MockHttpError {
  status: number;
  statusText?: string;
  message?: string;
  error?: any;
}

/**
 * Mock HttpClient for testing HTTP operations without making real requests
 */
export class MockHttpClient {
  private responses = new Map<string, MockHttpResponse>();
  private errors = new Map<string, MockHttpError>();
  private requestHistory: HttpRequestRecord[] = [];
  private defaultDelay = 0;

  /**
   * Mock HTTP GET request
   */
  get<T>(url: string, options?: any): Observable<T> {
    return this.makeRequest<T>('GET', url, undefined, options);
  }

  /**
   * Mock HTTP POST request
   */
  post<T>(url: string, body: any, options?: any): Observable<T> {
    return this.makeRequest<T>('POST', url, body, options);
  }

  /**
   * Mock HTTP PUT request
   */
  put<T>(url: string, body: any, options?: any): Observable<T> {
    return this.makeRequest<T>('PUT', url, body, options);
  }

  /**
   * Mock HTTP DELETE request
   */
  delete<T>(url: string, options?: any): Observable<T> {
    return this.makeRequest<T>('DELETE', url, undefined, options);
  }

  /**
   * Mock HTTP PATCH request
   */
  patch<T>(url: string, body: any, options?: any): Observable<T> {
    return this.makeRequest<T>('PATCH', url, body, options);
  }

  // Test Utilities

  /**
   * Set a mock response for a specific URL
   * @param url - The URL to mock
   * @param response - The response to return
   */
  setMockResponse<T>(url: string, response: T | MockHttpResponse<T>): void {
    if (this.isHttpResponse(response)) {
      this.responses.set(url, response);
    } else {
      this.responses.set(url, {
        body: response,
        status: 200,
        statusText: 'OK'
      });
    }
  }

  /**
   * Set a mock error for a specific URL
   * @param url - The URL to mock
   * @param error - The error to return
   */
  setMockError(url: string, error: MockHttpError | Error): void {
    if (error instanceof Error) {
      this.errors.set(url, {
        status: 500,
        statusText: 'Internal Server Error',
        message: error.message,
        error: error
      });
    } else {
      this.errors.set(url, error);
    }
  }

  /**
   * Clear all mock responses and errors
   */
  clearMocks(): void {
    this.responses.clear();
    this.errors.clear();
    this.requestHistory = [];
  }

  /**
   * Get the history of all requests made
   */
  getRequestHistory(): HttpRequestRecord[] {
    return [...this.requestHistory];
  }

  /**
   * Get requests filtered by method
   */
  getRequestsByMethod(method: string): HttpRequestRecord[] {
    return this.requestHistory.filter(req => req.method === method);
  }

  /**
   * Get requests filtered by URL pattern
   */
  getRequestsByUrl(urlPattern: string | RegExp): HttpRequestRecord[] {
    if (typeof urlPattern === 'string') {
      return this.requestHistory.filter(req => req.url.includes(urlPattern));
    }
    return this.requestHistory.filter(req => urlPattern.test(req.url));
  }

  /**
   * Get the last request made
   */
  getLastRequest(): HttpRequestRecord | null {
    return this.requestHistory[this.requestHistory.length - 1] || null;
  }

  /**
   * Check if a specific request was made
   */
  wasRequestMade(method: string, url: string): boolean {
    return this.requestHistory.some(req => req.method === method && req.url === url);
  }

  /**
   * Set default delay for all responses (useful for testing loading states)
   */
  setDefaultDelay(ms: number): void {
    this.defaultDelay = ms;
  }

  /**
   * Reset request history without clearing mocks
   */
  resetHistory(): void {
    this.requestHistory = [];
  }

  // Private Methods

  private makeRequest<T>(
    method: string,
    url: string,
    body?: any,
    options?: any
  ): Observable<T> {
    // Record the request
    this.recordRequest(method, url, body, options);

    // Check for mock error first
    if (this.errors.has(url)) {
      const errorConfig = this.errors.get(url)!;
      const httpError = new HttpErrorResponse({
        status: errorConfig.status,
        statusText: errorConfig.statusText || 'Error',
        error: errorConfig.error || errorConfig.message,
        url
      });
      return throwError(() => httpError);
    }

    // Check for mock response
    if (this.responses.has(url)) {
      const responseConfig = this.responses.get(url)!;
      const httpResponse = new HttpResponse({
        body: responseConfig.body,
        status: responseConfig.status || 200,
        statusText: responseConfig.statusText || 'OK',
        headers: new HttpHeaders(responseConfig.headers || {}),
        url
      });

      // Apply delay if configured
      if (this.defaultDelay > 0) {
        return new Observable(observer => {
          setTimeout(() => {
            observer.next(httpResponse.body);
            observer.complete();
          }, this.defaultDelay);
        });
      }

      return of(httpResponse.body);
    }

    // Default response if no mock is configured
    const defaultError = new HttpErrorResponse({
      status: 404,
      statusText: 'Not Found',
      error: `No mock configured for ${method} ${url}`,
      url
    });
    return throwError(() => defaultError);
  }

  private recordRequest(method: string, url: string, body?: any, options?: any): void {
    this.requestHistory.push({
      method,
      url,
      body,
      headers: options?.headers,
      params: options?.params,
      timestamp: Date.now()
    });
  }

  private isHttpResponse(obj: any): obj is MockHttpResponse {
    return obj && typeof obj === 'object' && 'body' in obj;
  }
}

/**
 * Create a mock HttpClient instance
 */
export function createMockHttpClient(): MockHttpClient {
  return new MockHttpClient();
}

/**
 * Create a mock HttpClient with predefined responses
 */
export function createMockHttpClientWithResponses(
  responses: Record<string, any>
): MockHttpClient {
  const client = new MockHttpClient();
  Object.entries(responses).forEach(([url, response]) => {
    client.setMockResponse(url, response);
  });
  return client;
}

/**
 * Common HTTP test scenarios
 */
export const HttpTestScenarios = {
  /**
   * Successful API responses
   */
  success: {
    contactForm: {
      body: { success: true, message: 'Contact form submitted successfully' },
      status: 200
    },
    userProfile: {
      body: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      },
      status: 200
    },
    channelData: {
      body: {
        channels: [
          {
            id: 'UC123456789',
            title: 'Test Channel',
            subscriberCount: '10000'
          }
        ]
      },
      status: 200
    }
  },

  /**
   * Error responses
   */
  errors: {
    unauthorized: {
      status: 401,
      statusText: 'Unauthorized',
      message: 'Authentication required'
    },
    forbidden: {
      status: 403,
      statusText: 'Forbidden',
      message: 'Access denied'
    },
    notFound: {
      status: 404,
      statusText: 'Not Found',
      message: 'Resource not found'
    },
    serverError: {
      status: 500,
      statusText: 'Internal Server Error',
      message: 'Server error occurred'
    },
    networkError: {
      status: 0,
      statusText: 'Network Error',
      message: 'Network connection failed'
    }
  }
};

/**
 * Helper function to create API endpoint URLs for testing
 */
export function createApiUrl(endpoint: string, baseUrl = 'https://api.example.com'): string {
  return `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
}
