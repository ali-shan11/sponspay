import { TestBed } from '@angular/core/testing';
import { HttpContext, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { loaderInterceptor } from './loader.interceptor';
import { LoaderService } from '@services/loader.service';
import { CUSTOM_REQUEST_CONTEXT } from './http-context.tokens';

describe('loaderInterceptor', () => {
  let mockLoaderService: jasmine.SpyObj<LoaderService>;

  const runInterceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => loaderInterceptor(req, next));

  beforeEach(() => {
    mockLoaderService = jasmine.createSpyObj('LoaderService', ['show', 'hide']);

    TestBed.configureTestingModule({
      providers: [
        { provide: LoaderService, useValue: mockLoaderService }
      ]
    });
  });

  it('should be created', () => {
    expect(runInterceptor).toBeTruthy();
  });

  it('should show and hide loader when showLoader is true in context', () => {
    const context = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, { showLoader: true });
    const req = new HttpRequest('GET', '/api/test', { context });
    const mockResponse = new HttpResponse({ status: 200, body: {} });
    const next = jasmine.createSpy('next').and.returnValue(of(mockResponse));

    // Subscribe and let it complete synchronously
    runInterceptor(req, next).subscribe();

    expect(mockLoaderService.show).toHaveBeenCalledTimes(1);
    expect(mockLoaderService.hide).toHaveBeenCalledTimes(1);
  });

  it('should not show or hide loader when showLoader is false in context', () => {
    const context = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, { showLoader: false });
    const req = new HttpRequest('GET', '/api/test', { context });
    const mockResponse = new HttpResponse({ status: 200, body: {} });
    const next = jasmine.createSpy('next').and.returnValue(of(mockResponse));

    runInterceptor(req, next).subscribe();

    expect(mockLoaderService.show).not.toHaveBeenCalled();
    expect(mockLoaderService.hide).not.toHaveBeenCalled();
  });

  it('should not show loader when using default context (showLoader defaults to false)', () => {
    const req = new HttpRequest('GET', '/api/test');
    const mockResponse = new HttpResponse({ status: 200, body: {} });
    const next = jasmine.createSpy('next').and.returnValue(of(mockResponse));

    runInterceptor(req, next).subscribe();

    expect(mockLoaderService.show).not.toHaveBeenCalled();
    expect(mockLoaderService.hide).not.toHaveBeenCalled();
  });

  it('should hide loader even when request errors out (finalize runs on error)', () => {
    const context = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, { showLoader: true });
    const req = new HttpRequest('GET', '/api/test', { context });
    const next = jasmine.createSpy('next').and.returnValue(throwError(() => new Error('Network error')));

    runInterceptor(req, next).subscribe({
      error: () => { /* expected error */ }
    });

    expect(mockLoaderService.show).toHaveBeenCalledTimes(1);
    expect(mockLoaderService.hide).toHaveBeenCalledTimes(1);
  });

  it('should not hide loader on error when showLoader is false', () => {
    const context = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, { showLoader: false });
    const req = new HttpRequest('GET', '/api/test', { context });
    const next = jasmine.createSpy('next').and.returnValue(throwError(() => new Error('Network error')));

    runInterceptor(req, next).subscribe({
      error: () => { /* expected error */ }
    });

    expect(mockLoaderService.show).not.toHaveBeenCalled();
    expect(mockLoaderService.hide).not.toHaveBeenCalled();
  });

  it('should call next handler with the request', () => {
    const req = new HttpRequest('GET', '/api/test');
    const mockResponse = new HttpResponse({ status: 200, body: {} });
    const next = jasmine.createSpy('next').and.returnValue(of(mockResponse));

    runInterceptor(req, next).subscribe();

    expect(next).toHaveBeenCalledWith(req);
  });

  it('should show loader before calling next', () => {
    const callOrder: string[] = [];
    mockLoaderService.show.and.callFake(() => { callOrder.push('show'); });

    const context = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, { showLoader: true });
    const req = new HttpRequest('GET', '/api/test', { context });
    const mockResponse = new HttpResponse({ status: 200, body: {} });
    const next = jasmine.createSpy('next').and.callFake(() => {
      callOrder.push('next');
      return of(mockResponse);
    });

    runInterceptor(req, next).subscribe();

    expect(callOrder[0]).toBe('show');
    expect(callOrder[1]).toBe('next');
  });

  it('should pass through the response from next handler', () => {
    const context = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, { showLoader: true });
    const req = new HttpRequest('GET', '/api/test', { context });
    const expectedBody = { data: 'test' };
    const mockResponse = new HttpResponse({ status: 200, body: expectedBody });
    const next = jasmine.createSpy('next').and.returnValue(of(mockResponse));
    let receivedResponse: HttpResponse<unknown> | undefined;

    runInterceptor(req, next).subscribe(event => {
      if (event instanceof HttpResponse) {
        receivedResponse = event;
      }
    });

    expect(receivedResponse).toBeDefined();
    expect(receivedResponse!.body).toEqual(expectedBody);
  });
});
