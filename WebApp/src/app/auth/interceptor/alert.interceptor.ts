import { ApiError } from './../../types/alerts.d';
import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AlertService } from '@services/alert.service';
import { tap, catchError, throwError } from 'rxjs';
import { CUSTOM_REQUEST_CONTEXT } from './http-context.tokens';

interface ApiResponse {
  success: boolean;
  message: string;
}

export const alertInterceptor: HttpInterceptorFn = (req, next) => {
  const alert = inject(AlertService);
  const ctx = req.context.get(CUSTOM_REQUEST_CONTEXT);

  const skip = ctx.skipAlert ?? false;
  const customSuccess = ctx.customSuccessAlert;
  const customError = ctx.customErrorAlert;
  const customInfo = ctx.customInfoAlert;
  

  return next(req).pipe(
    tap(event => {
      if (skip || !(event instanceof HttpResponse)) return;

      // Skip success alerts for GET requests (list loading)
      if (req.method === 'GET') return;

      const body = event.body as ApiResponse | null;

      // Case 1: API success (2xx) + success: true → show custom or default
      if (body?.success === true) {
        if (customSuccess) {
          alert.success(customSuccess?.title || 'Success', customSuccess?.message || body?.message);
        } else if (customInfo) {
          alert.info(customInfo?.title || 'Info', customInfo?.message || body?.message);
        }else if (body.message) {
          alert.success('Success', body.message);
        }
        return;
      }

      // Case 2: API success (2xx) but success: false → treat as business error
      if (body?.success === false) {
        const msg = customError?.message || body.message || 'Operation failed';
        const title = customError?.title || 'Error';
        alert.error(title, msg);
        return;
      }
    }),

    catchError(err => {
      if (!skip) handleError(err, alert);
      return throwError(() => err);
    })
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getErrorTitle(error: any): string {
  const err = error?.error;

  if (typeof err === 'string') {
    return err; // plain string error
  }

  if (typeof err === 'object' && err !== null) {
    return err.message || err.error?.message || JSON.stringify(err);
  }

  return error?.name || 'Error';
}

//centralized error handling
function handleError(err: HttpErrorResponse | Error, alert: AlertService): void {
  let title = 'Error';
  let message = 'An unknown error occurred';

  if (err instanceof HttpErrorResponse) {
    if (err.error instanceof ErrorEvent || err?.error?.error) {
      const error = err.error as ApiError;
      
      title = getErrorTitle(error) || 'Error';
      message = error?.message || 'An unknown error occurred';
    } else {
      switch (err.status) {
        case 0:
          message = 'No internet connection or server unreachable';
          break;
        case 401:
          message = 'Unauthorized – please log in again';
          break;
        case 403:
          message = 'Forbidden – you don’t have permission';
          break;
        case 404:
          message = 'Resource not found';
          break;
        case 408:
        case 504:
          message = 'Request timed out';
          break;
        case 500:
          message = 'Internal server error';
          break;
        default:
          message = err.error?.message || err.message || message;
      }
    }
  } else if (err.name === 'TimeoutError') {
    message = 'Request timed out';
  }

  alert.error(title, message);
}