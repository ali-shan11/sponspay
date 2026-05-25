import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../app/services/token.service';

async function checkAuth(): Promise<boolean | ReturnType<Router['createUrlTree']>> {
  const tokenService = inject(TokenService);
  const router = inject(Router);
  const authToken = await tokenService.getToken();

  if (authToken) {
    return true;
  }

  // redirect if not logged in
  return router.createUrlTree(['/']);
}

export const authGuard: CanActivateFn = async () => {
  return await checkAuth();
};

export const authChildGuard: CanActivateChildFn = async () => {
  return await checkAuth();
};
