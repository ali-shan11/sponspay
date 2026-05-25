import { TestBed } from '@angular/core/testing';
import { CanActivateFn, CanActivateChildFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { TokenService } from '../app/services/token.service';
import { authGuard, authChildGuard } from './auth.guard';

describe('authGuard', () => {
  let mockTokenService: jasmine.SpyObj<TokenService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;

  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));

  const executeChildGuard: CanActivateChildFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authChildGuard(...guardParameters));

  beforeEach(() => {
    mockTokenService = jasmine.createSpyObj('TokenService', ['getToken'], {
      authReady: Promise.resolve()
    });
    mockRouter = jasmine.createSpyObj('Router', ['createUrlTree']);

    mockRoute = {} as ActivatedRouteSnapshot;
    mockState = { url: '/dashboard' } as RouterStateSnapshot;

    TestBed.configureTestingModule({
      providers: [
        { provide: TokenService, useValue: mockTokenService },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  describe('authGuard (canActivate)', () => {
    it('should be defined', () => {
      expect(executeGuard).toBeTruthy();
    });

    it('should return true when token exists', async () => {
      mockTokenService.getToken.and.returnValue(Promise.resolve('valid-token'));

      const result = await executeGuard(mockRoute, mockState);

      expect(result).toBe(true);
      expect(mockTokenService.getToken).toHaveBeenCalled();
      expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
    });

    it('should redirect to root when token is null', async () => {
      const mockUrlTree = {} as UrlTree;
      mockTokenService.getToken.and.returnValue(Promise.resolve(null));
      mockRouter.createUrlTree.and.returnValue(mockUrlTree);

      const result = await executeGuard(mockRoute, mockState);

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
    });

    it('should redirect to root when token is empty string (falsy)', async () => {
      const mockUrlTree = {} as UrlTree;
      mockTokenService.getToken.and.returnValue(Promise.resolve(''));
      mockRouter.createUrlTree.and.returnValue(mockUrlTree);

      const result = await executeGuard(mockRoute, mockState);

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
    });
  });

  describe('authChildGuard (canActivateChild)', () => {
    it('should be defined', () => {
      expect(executeChildGuard).toBeTruthy();
    });

    it('should return true when token exists', async () => {
      mockTokenService.getToken.and.returnValue(Promise.resolve('valid-token'));

      const result = await executeChildGuard(mockRoute, mockState);

      expect(result).toBe(true);
      expect(mockTokenService.getToken).toHaveBeenCalled();
    });

    it('should redirect to root when token is null', async () => {
      const mockUrlTree = {} as UrlTree;
      mockTokenService.getToken.and.returnValue(Promise.resolve(null));
      mockRouter.createUrlTree.and.returnValue(mockUrlTree);

      const result = await executeChildGuard(mockRoute, mockState);

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
    });

    it('should redirect to root when token is empty string (falsy)', async () => {
      const mockUrlTree = {} as UrlTree;
      mockTokenService.getToken.and.returnValue(Promise.resolve(''));
      mockRouter.createUrlTree.and.returnValue(mockUrlTree);

      const result = await executeChildGuard(mockRoute, mockState);

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
    });
  });
});
