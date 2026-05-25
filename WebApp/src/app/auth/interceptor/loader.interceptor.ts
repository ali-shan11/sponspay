import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoaderService } from '@services/loader.service';
import { finalize } from 'rxjs';
import { CUSTOM_REQUEST_CONTEXT } from './http-context.tokens';

export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
  const loader = inject(LoaderService);
  const ctx = req.context.get(CUSTOM_REQUEST_CONTEXT);
  const show = ctx.showLoader;

  if (show) {
    loader.show();
  }

  return next(req).pipe(
    finalize(() => {
      if (show) {
        loader.hide();
      }
    })
  );
};
