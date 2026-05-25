import { TestBed } from '@angular/core/testing';
import { HttpContext, HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { alertInterceptor } from './alert.interceptor';
import { AlertService } from '@services/alert.service';
import { CUSTOM_REQUEST_CONTEXT } from './http-context.tokens';

describe('alertInterceptor', () => {
  let mockAlertService: jasmine.SpyObj<AlertService>;

  const runInterceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => alertInterceptor(req, next));

  beforeEach(() => {
    mockAlertService = jasmine.createSpyObj('AlertService', ['success', 'error', 'info']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AlertService, useValue: mockAlertService }
      ]
    });
  });

  it('should be created', () => {
    expect(runInterceptor).toBeTruthy();
  });

  // ---- Success path (POST/PUT/PATCH) with body.success === true ----

  it('should show default success alert for non-GET requests with body.success === true and a message', () => {
    const req = new HttpRequest('POST', '/api/test', {});
    const body = { success: true, message: 'Item created' };
    const next = jasmine.createSpy('next').and.returnValue(of(new HttpResponse({ status: 200, body })));

    runInterceptor(req, next).subscribe();

    expect(mockAlertService.success).toHaveBeenCalledWith('Success', 'Item created');
  });

  it('should show custom success alert when customSuccessAlert is set', () => {
    const context = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, {
      customSuccessAlert: { title: 'Done!', message: 'Custom success message' }
    });
    const req = new HttpRequest('POST', '/api/test', {}, { context });
    const body = { success: true, message: 'Default message' };
    const next = jasmine.createSpy('next').and.returnValue(of(new HttpResponse({ status: 200, body })));

    runInterceptor(req, next).subscribe();

    expect(mockAlertService.success).toHaveBeenCalledWith('Done!', 'Custom success message');
  });

  it('should use body.message as fallback when customSuccessAlert has no message', () => {
    const context = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, {
      customSuccessAlert: { title: 'Done!' }
    });
    const req = new HttpRequest('POST', '/api/test', {}, { context });
    const body = { success: true, message: 'Body message' };
    const next = jasmine.createSpy('next').and.returnValue(of(new HttpResponse({ status: 200, body })));

    runInterceptor(req, next).subscribe();

    expect(mockAlertService.success).toHaveBeenCalledWith('Done!', 'Body message');
  });

  it('should use "Success" as fallback title when customSuccessAlert has no title', () => {
    const context = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, {
      customSuccessAlert: { message: 'Custom msg' }
    });
    const req = new HttpRequest('POST', '/api/test', {}, { context });
    const body = { success: true, message: 'Body message' };
    const next = jasmine.createSpy('next').and.returnValue(of(new HttpResponse({ status: 200, body })));

    runInterceptor(req, next).subscribe();

    expect(mockAlertService.success).toHaveBeenCalledWith('Success', 'Custom msg');
  });

  it('should show customInfoAlert when set (and no customSuccessAlert)', () => {
    const context = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, {
      customInfoAlert: { title: 'Info', message: 'Info message' }
    });
    const req = new HttpRequest('PUT', '/api/test', {}, { context });
    const body = { success: true, message: 'Default message' };
    const next = jasmine.createSpy('next').and.returnValue(of(new HttpResponse({ status: 200, body })));

    runInterceptor(req, next).subscribe();

    expect(mockAlertService.info).toHaveBeenCalledWith('Info', 'Info message');
  });

  it('should not show success alert when body.success is true but there is no message and no custom alerts', () => {
    const req = new HttpRequest('POST', '/api/test', {});
    const body = { success: true };
    const next = jasmine.createSpy('next').and.returnValue(of(new HttpResponse({ status: 200, body })));

    runInterceptor(req, next).subscribe();

    expect(mockAlertService.success).not.toHaveBeenCalled();
  });

  // ---- Success path: GET requests should skip alerts ----

  it('should not show any success alert for GET requests', () => {
    const req = new HttpRequest('GET', '/api/test');
    const body = { success: true, message: 'Data loaded' };
    const next = jasmine.createSpy('next').and.returnValue(of(new HttpResponse({ status: 200, body })));

    runInterceptor(req, next).subscribe();

    expect(mockAlertService.success).not.toHaveBeenCalled();
    expect(mockAlertService.error).not.toHaveBeenCalled();
  });

  // ---- Body.success === false (business error in 2xx) ----

  it('should show error alert when body.success is false with default message', () => {
    const req = new HttpRequest('POST', '/api/test', {});
    const body = { success: false, message: 'Validation failed' };
    const next = jasmine.createSpy('next').and.returnValue(of(new HttpResponse({ status: 200, body })));

    runInterceptor(req, next).subscribe();

    expect(mockAlertService.error).toHaveBeenCalledWith('Error', 'Validation failed');
  });

  it('should show customErrorAlert when body.success is false and custom error is set', () => {
    const context = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, {
      customErrorAlert: { title: 'Oops', message: 'Custom error' }
    });
    const req = new HttpRequest('POST', '/api/test', {}, { context });
    const body = { success: false, message: 'Default error' };
    const next = jasmine.createSpy('next').and.returnValue(of(new HttpResponse({ status: 200, body })));

    runInterceptor(req, next).subscribe();

    expect(mockAlertService.error).toHaveBeenCalledWith('Oops', 'Custom error');
  });

  it('should show "Operation failed" when body.success is false with no message and no custom error', () => {
    const req = new HttpRequest('POST', '/api/test', {});
    const body = { success: false } as { success: boolean; message?: string };
    const next = jasmine.createSpy('next').and.returnValue(of(new HttpResponse({ status: 200, body })));

    runInterceptor(req, next).subscribe();

    expect(mockAlertService.error).toHaveBeenCalledWith('Error', 'Operation failed');
  });

  // ---- skipAlert ----

  it('should skip all alerts when skipAlert is true', () => {
    const context = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, { skipAlert: true });
    const req = new HttpRequest('POST', '/api/test', {}, { context });
    const body = { success: true, message: 'Should not show' };
    const next = jasmine.createSpy('next').and.returnValue(of(new HttpResponse({ status: 200, body })));

    runInterceptor(req, next).subscribe();

    expect(mockAlertService.success).not.toHaveBeenCalled();
    expect(mockAlertService.error).not.toHaveBeenCalled();
  });

  it('should skip error handling when skipAlert is true and request fails', () => {
    const context = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, { skipAlert: true });
    const req = new HttpRequest('POST', '/api/test', {}, { context });
    const httpError = new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' });
    const next = jasmine.createSpy('next').and.returnValue(throwError(() => httpError));

    runInterceptor(req, next).subscribe({
      error: () => { /* expected */ }
    });

    expect(mockAlertService.error).not.toHaveBeenCalled();
  });

  // ---- catchError: HttpErrorResponse paths ----

  it('should show error for HttpErrorResponse with error.error object', () => {
    const req = new HttpRequest('POST', '/api/test', {});
    const httpError = new HttpErrorResponse({
      status: 400,
      statusText: 'Bad Request',
      error: { error: 'Bad Request', message: 'Invalid data', statusCode: '400' }
    });
    const next = jasmine.createSpy('next').and.returnValue(throwError(() => httpError));

    runInterceptor(req, next).subscribe({
      error: () => { /* expected */ }
    });

    expect(mockAlertService.error).toHaveBeenCalledWith('Bad Request', 'Invalid data');
  });

  it('should show error for HttpErrorResponse with string error', () => {
    const req = new HttpRequest('POST', '/api/test', {});
    const httpError = new HttpErrorResponse({
      status: 400,
      statusText: 'Bad Request',
      error: { error: 'Simple error string', message: 'Some message' }
    });
    const next = jasmine.createSpy('next').and.returnValue(throwError(() => httpError));

    runInterceptor(req, next).subscribe({
      error: () => { /* expected */ }
    });

    expect(mockAlertService.error).toHaveBeenCalledWith('Simple error string', 'Some message');
  });

  it('should handle status 0 (no internet)', () => {
    const req = new HttpRequest('POST', '/api/test', {});
    const httpError = new HttpErrorResponse({ status: 0 });
    const next = jasmine.createSpy('next').and.returnValue(throwError(() => httpError));

    runInterceptor(req, next).subscribe({
      error: () => { /* expected */ }
    });

    expect(mockAlertService.error).toHaveBeenCalledWith('Error', 'No internet connection or server unreachable');
  });

  it('should handle status 401 (Unauthorized)', () => {
    const req = new HttpRequest('POST', '/api/test', {});
    const httpError = new HttpErrorResponse({ status: 401 });
    const next = jasmine.createSpy('next').and.returnValue(throwError(() => httpError));

    runInterceptor(req, next).subscribe({
      error: () => { /* expected */ }
    });

    expect(mockAlertService.error).toHaveBeenCalledWith('Error', 'Unauthorized – please log in again');
  });

  it('should handle status 403 (Forbidden)', () => {
    const req = new HttpRequest('POST', '/api/test', {});
    const httpError = new HttpErrorResponse({ status: 403 });
    const next = jasmine.createSpy('next').and.returnValue(throwError(() => httpError));

    runInterceptor(req, next).subscribe({
      error: () => { /* expected */ }
    });

    expect(mockAlertService.error).toHaveBeenCalledWith('Error', jasmine.stringContaining('have permission'));
  });

  it('should handle status 404 (Not Found)', () => {
    const req = new HttpRequest('POST', '/api/test', {});
    const httpError = new HttpErrorResponse({ status: 404 });
    const next = jasmine.createSpy('next').and.returnValue(throwError(() => httpError));

    runInterceptor(req, next).subscribe({
      error: () => { /* expected */ }
    });

    expect(mockAlertService.error).toHaveBeenCalledWith('Error', 'Resource not found');
  });

  it('should handle status 408 (Request Timeout)', () => {
    const req = new HttpRequest('POST', '/api/test', {});
    const httpError = new HttpErrorResponse({ status: 408 });
    const next = jasmine.createSpy('next').and.returnValue(throwError(() => httpError));

    runInterceptor(req, next).subscribe({
      error: () => { /* expected */ }
    });

    expect(mockAlertService.error).toHaveBeenCalledWith('Error', 'Request timed out');
  });

  it('should handle status 504 (Gateway Timeout)', () => {
    const req = new HttpRequest('POST', '/api/test', {});
    const httpError = new HttpErrorResponse({ status: 504 });
    const next = jasmine.createSpy('next').and.returnValue(throwError(() => httpError));

    runInterceptor(req, next).subscribe({
      error: () => { /* expected */ }
    });

    expect(mockAlertService.error).toHaveBeenCalledWith('Error', 'Request timed out');
  });

  it('should handle status 500 (Internal Server Error)', () => {
    const req = new HttpRequest('POST', '/api/test', {});
    const httpError = new HttpErrorResponse({ status: 500 });
    const next = jasmine.createSpy('next').and.returnValue(throwError(() => httpError));

    runInterceptor(req, next).subscribe({
      error: () => { /* expected */ }
    });

    expect(mockAlertService.error).toHaveBeenCalledWith('Error', 'Internal server error');
  });

  it('should use err.error.message for unknown status codes when available', () => {
    const req = new HttpRequest('POST', '/api/test', {});
    const httpError = new HttpErrorResponse({
      status: 429,
      error: { message: 'Too many requests' }
    });
    const next = jasmine.createSpy('next').and.returnValue(throwError(() => httpError));

    runInterceptor(req, next).subscribe({
      error: () => { /* expected */ }
    });

    expect(mockAlertService.error).toHaveBeenCalledWith('Error', 'Too many requests');
  });

  it('should handle TimeoutError', () => {
    const req = new HttpRequest('POST', '/api/test', {});
    const timeoutError = new Error('Request timed out');
    timeoutError.name = 'TimeoutError';
    const next = jasmine.createSpy('next').and.returnValue(throwError(() => timeoutError));

    runInterceptor(req, next).subscribe({
      error: () => { /* expected */ }
    });

    expect(mockAlertService.error).toHaveBeenCalledWith('Error', 'Request timed out');
  });

  it('should show unknown error for non-HttpErrorResponse and non-TimeoutError', () => {
    const req = new HttpRequest('POST', '/api/test', {});
    const genericError = new Error('Something went wrong');
    genericError.name = 'SomeOtherError';
    const next = jasmine.createSpy('next').and.returnValue(throwError(() => genericError));

    runInterceptor(req, next).subscribe({
      error: () => { /* expected */ }
    });

    expect(mockAlertService.error).toHaveBeenCalledWith('Error', 'An unknown error occurred');
  });

  it('should re-throw error after handling it', () => {
    const req = new HttpRequest('POST', '/api/test', {});
    const httpError = new HttpErrorResponse({ status: 500 });
    const next = jasmine.createSpy('next').and.returnValue(throwError(() => httpError));
    let caughtError: unknown;

    runInterceptor(req, next).subscribe({
      error: (err) => { caughtError = err; }
    });

    expect(caughtError).toBe(httpError);
  });

  it('should handle null body gracefully', () => {
    const req = new HttpRequest('POST', '/api/test', {});
    const next = jasmine.createSpy('next').and.returnValue(of(new HttpResponse({ status: 200, body: null })));

    runInterceptor(req, next).subscribe();

    expect(mockAlertService.success).not.toHaveBeenCalled();
    expect(mockAlertService.error).not.toHaveBeenCalled();
  });

  it('should handle HttpErrorResponse with ErrorEvent in error', () => {
    const req = new HttpRequest('POST', '/api/test', {});
    // ErrorEvent-like error with nested error property
    const httpError = new HttpErrorResponse({
      status: 0,
      error: new ErrorEvent('error', { message: 'Client-side error' })
    });
    const next = jasmine.createSpy('next').and.returnValue(throwError(() => httpError));

    runInterceptor(req, next).subscribe({
      error: () => { /* expected */ }
    });

    expect(mockAlertService.error).toHaveBeenCalled();
  });

  it('should handle HttpErrorResponse with nested error.error.message', () => {
    const req = new HttpRequest('POST', '/api/test', {});
    const httpError = new HttpErrorResponse({
      status: 400,
      error: {
        error: { message: 'Nested error message' },
        message: 'Top level message'
      }
    });
    const next = jasmine.createSpy('next').and.returnValue(throwError(() => httpError));

    runInterceptor(req, next).subscribe({
      error: () => { /* expected */ }
    });

    expect(mockAlertService.error).toHaveBeenCalled();
  });

  it('should handle default status code with err.message fallback', () => {
    const req = new HttpRequest('POST', '/api/test', {});
    const httpError = new HttpErrorResponse({
      status: 502,
      statusText: 'Bad Gateway'
    });
    const next = jasmine.createSpy('next').and.returnValue(throwError(() => httpError));

    runInterceptor(req, next).subscribe({
      error: () => { /* expected */ }
    });

    expect(mockAlertService.error).toHaveBeenCalled();
    const errorCall = mockAlertService.error.calls.mostRecent();
    expect(errorCall.args[0]).toBe('Error');
  });

  it('should handle error with object error that has no message - falls back to JSON.stringify', () => {
    const req = new HttpRequest('POST', '/api/test', {});
    const httpError = new HttpErrorResponse({
      status: 400,
      error: {
        error: { code: 'VALIDATION_ERROR' },
        message: 'Validation message'
      }
    });
    const next = jasmine.createSpy('next').and.returnValue(throwError(() => httpError));

    runInterceptor(req, next).subscribe({
      error: () => { /* expected */ }
    });

    expect(mockAlertService.error).toHaveBeenCalled();
  });

  it('should use error.name as fallback when error.error is undefined', () => {
    const req = new HttpRequest('POST', '/api/test', {});
    // Create an HttpErrorResponse with error property that has no "error" subproperty
    // but where .error is a plain string in the HttpErrorResponse
    const httpError = new HttpErrorResponse({
      status: 422,
      error: null
    });
    const next = jasmine.createSpy('next').and.returnValue(throwError(() => httpError));

    runInterceptor(req, next).subscribe({
      error: () => { /* expected */ }
    });

    expect(mockAlertService.error).toHaveBeenCalled();
  });

  it('should prioritize customSuccessAlert over customInfoAlert', () => {
    const context = new HttpContext().set(CUSTOM_REQUEST_CONTEXT, {
      customSuccessAlert: { title: 'Success Title', message: 'Success Msg' },
      customInfoAlert: { title: 'Info Title', message: 'Info Msg' }
    });
    const req = new HttpRequest('POST', '/api/test', {}, { context });
    const body = { success: true, message: 'Default' };
    const next = jasmine.createSpy('next').and.returnValue(of(new HttpResponse({ status: 200, body })));

    runInterceptor(req, next).subscribe();

    expect(mockAlertService.success).toHaveBeenCalledWith('Success Title', 'Success Msg');
    expect(mockAlertService.success).toHaveBeenCalledTimes(1);
  });
});
