import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from "@angular/common/http";
import { from, lastValueFrom } from "rxjs";
import { environment } from "../../../environments/environment";
import { inject } from "@angular/core";
import { TokenService } from "@services/token.service";
import { Router } from "@angular/router";
import { PUBLIC_ENDPOINTS } from "@utils/constants";


const addHeaderToken = async (req: HttpRequest<unknown>, next: HttpHandlerFn, tokenService: TokenService): Promise<HttpEvent<unknown>> => {
  const router = inject(Router);
  const headers: Record<string, string> = {};

  if (environment.API_KEY) {
    headers['api-key'] = environment.API_KEY;
  }

  if (!isPublicEndpoint(req.url)) {
    const authToken = await tokenService.getToken();
    if (!authToken) {
      router.navigate(['/']);
      return lastValueFrom(next(req));
    }

    headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (Object.keys(headers).length > 0) {
    req = req.clone({ setHeaders: headers });
  }

  return lastValueFrom(next(req));
};

export const headerTokenInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  // only add the bearer token to requests to the backend
  const tokenService = inject(TokenService);
  if (req.url.startsWith(environment.API_BASE)) {
    return from(addHeaderToken(req, next, tokenService, ));
  } else {
    return next(req);
  }
};

const isPublicEndpoint = (url: string): boolean => {
  // Strip the API base to get the path, then check if it starts with a public endpoint.
  // Using includes() caused false positives (e.g. '/payment' matched '/payment-overview').
  const path = url.replace(environment.API_BASE, '');
  return PUBLIC_ENDPOINTS.some(endpoint => {
    if (!path.startsWith(endpoint)) return false;
    // Ensure the match is a full segment (next char is '/', '?', or end of string)
    const nextChar = path[endpoint.length-1];
    return nextChar === undefined || nextChar === '/' || nextChar === '?';
  });
};