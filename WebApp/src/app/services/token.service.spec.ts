import { UserData } from '@app-types/components';
import { userPlaceholderImage } from '@utils/constants';
import { TokenService } from './token.service';
import { initializeApp, getApps } from '@angular/fire/app';

/**
 * TokenService spec.
 *
 * The service constructor calls getAuth() and onAuthStateChanged() directly
 * from the @angular/fire/auth module (not injected via DI), and those module
 * exports are sealed by webpack (non-writable, non-configurable).
 *
 * Strategy: create instances via Object.create(TokenService.prototype) to skip
 * the constructor, then manually set the private fields (token, user,
 * authReady, resolveAuthReady) so we can exercise every public and private
 * method on the REAL class.  Coverage instruments the method bodies, so this
 * approach reaches every statement/branch/function in the source file.
 */
describe('TokenService', () => {

  /**
   * Build a TokenService instance whose private state is fully controlled
   * by the test, without running the real constructor.
   */
  function createService(opts?: {
    token?: string | null;
    user?: any;
    authResolved?: boolean;
  }): TokenService {
    const svc = Object.create(TokenService.prototype) as TokenService;

    // Set private fields via bracket notation
    (svc as any).token = opts?.token ?? null;
    (svc as any).user = opts?.user ?? null;

    if (opts?.authResolved === false) {
      // Create an unresolved authReady promise and store the resolver
      let resolver: (() => void) | null = null;
      (svc as any).authReady = new Promise<void>(resolve => {
        resolver = resolve;
      });
      (svc as any).resolveAuthReady = resolver;
    } else {
      // Default: already resolved
      (svc as any).authReady = Promise.resolve();
      (svc as any).resolveAuthReady = null;
    }

    return svc;
  }

  /** Create a valid JWT token with the given exp-offset from now (in seconds). */
  function createValidJwt(expOffsetSeconds = 3600): string {
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        iss: 'test',
        exp: Math.floor(Date.now() / 1000) + expOffsetSeconds,
        iat: Math.floor(Date.now() / 1000),
      })
    );
    return `${header}.${payload}.mock-sig`;
  }

  /** Convenience: expired JWT (1 hour ago). */
  function createExpiredJwt(): string {
    return createValidJwt(-3600);
  }

  /** Build a minimal mock that satisfies the Firebase User shape used by the service. */
  function createMockUser(overrides?: {
    displayName?: string | null;
    email?: string | null;
    photoURL?: string | null;
    getIdToken?: (forceRefresh?: boolean) => Promise<string>;
  }): any {
    const defaultGetIdToken = jasmine
      .createSpy('getIdToken')
      .and.callFake(() => Promise.resolve(createValidJwt()));
    return {
      displayName: overrides?.displayName !== undefined ? overrides.displayName : 'Test User',
      email: overrides?.email !== undefined ? overrides.email : 'test@example.com',
      photoURL: overrides?.photoURL !== undefined ? overrides.photoURL : 'https://example.com/photo.jpg',
      getIdToken: overrides?.getIdToken ?? defaultGetIdToken,
    };
  }

  // -------------------------------------------------------------------
  // getToken()
  // -------------------------------------------------------------------
  describe('getToken()', () => {
    it('should return the cached token when it is still valid', async () => {
      const validJwt = createValidJwt();
      const service = createService({ token: validJwt, user: createMockUser() });

      const result = await service.getToken();
      expect(result).toBe(validJwt);
    });

    it('should return null when no token and no user', async () => {
      const service = createService({ token: null, user: null });

      const result = await service.getToken();
      expect(result).toBeNull();
    });

    it('should force-refresh when the token is expired and user is present', async () => {
      const freshJwt = createValidJwt();
      const getIdTokenSpy = jasmine
        .createSpy('getIdToken')
        .and.returnValue(Promise.resolve(freshJwt));

      const service = createService({
        token: createExpiredJwt(),
        user: createMockUser({ getIdToken: getIdTokenSpy }),
      });

      const result = await service.getToken();
      expect(result).toBe(freshJwt);
      expect(getIdTokenSpy).toHaveBeenCalledWith(true);
    });

    it('should force-refresh when the token is malformed and user is present', async () => {
      const freshJwt = createValidJwt();
      const getIdTokenSpy = jasmine
        .createSpy('getIdToken')
        .and.returnValue(Promise.resolve(freshJwt));

      const service = createService({
        token: 'not-a-valid-jwt',
        user: createMockUser({ getIdToken: getIdTokenSpy }),
      });

      const result = await service.getToken();
      expect(result).toBe(freshJwt);
      expect(getIdTokenSpy).toHaveBeenCalledWith(true);
    });

    it('should return null when token is invalid and no user is present', async () => {
      const service = createService({
        token: createExpiredJwt(),
        user: null,
      });

      const result = await service.getToken();
      expect(result).toBeNull();
    });

    it('should return null when token is null and user is null', async () => {
      const service = createService({ token: null, user: null });

      const result = await service.getToken();
      expect(result).toBeNull();
    });

    it('should force-refresh when token has invalid JSON in payload', async () => {
      const header = btoa(JSON.stringify({ alg: 'RS256' }));
      const invalidPayload = btoa('not-json{{{');
      const badToken = `${header}.${invalidPayload}.sig`;

      const freshJwt = createValidJwt();
      const getIdTokenSpy = jasmine
        .createSpy('getIdToken')
        .and.returnValue(Promise.resolve(freshJwt));

      const service = createService({
        token: badToken,
        user: createMockUser({ getIdToken: getIdTokenSpy }),
      });

      const result = await service.getToken();
      expect(result).toBe(freshJwt);
    });

    it('should force-refresh when token payload is missing the exp field', async () => {
      const header = btoa(JSON.stringify({ alg: 'RS256' }));
      const payload = btoa(JSON.stringify({ iss: 'test', iat: 123 }));
      const noExpToken = `${header}.${payload}.sig`;

      const freshJwt = createValidJwt();
      const getIdTokenSpy = jasmine
        .createSpy('getIdToken')
        .and.returnValue(Promise.resolve(freshJwt));

      const service = createService({
        token: noExpToken,
        user: createMockUser({ getIdToken: getIdTokenSpy }),
      });

      const result = await service.getToken();
      expect(result).toBe(freshJwt);
    });

    it('should force-refresh when token expires at exactly the current second', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ exp: nowSec }));
      const edgeToken = `${header}.${payload}.sig`;

      const freshJwt = createValidJwt();
      const getIdTokenSpy = jasmine
        .createSpy('getIdToken')
        .and.returnValue(Promise.resolve(freshJwt));

      const service = createService({
        token: edgeToken,
        user: createMockUser({ getIdToken: getIdTokenSpy }),
      });

      const result = await service.getToken();
      expect(result).toBe(freshJwt);
    });
  });

  // -------------------------------------------------------------------
  // refreshToken()
  // -------------------------------------------------------------------
  describe('refreshToken()', () => {
    it('should return null when no user is set', async () => {
      const service = createService({ user: null });

      const result = await service.refreshToken();
      expect(result).toBeNull();
    });

    it('should force-refresh and return the new token', async () => {
      const freshJwt = createValidJwt();
      const getIdTokenSpy = jasmine
        .createSpy('getIdToken')
        .and.returnValue(Promise.resolve(freshJwt));

      const service = createService({
        user: createMockUser({ getIdToken: getIdTokenSpy }),
      });

      const result = await service.refreshToken();
      expect(result).toBe(freshJwt);
      expect(getIdTokenSpy).toHaveBeenCalledWith(true);
    });

    it('should update the internal token after refresh', async () => {
      const freshJwt = createValidJwt();
      const getIdTokenSpy = jasmine
        .createSpy('getIdToken')
        .and.returnValue(Promise.resolve(freshJwt));

      const service = createService({
        token: createExpiredJwt(),
        user: createMockUser({ getIdToken: getIdTokenSpy }),
      });

      await service.refreshToken();
      // The next getToken should return the refreshed JWT without calling getIdToken again
      // because the cached token is now fresh
      const result = await service.getToken();
      expect(result).toBe(freshJwt);
    });
  });

  // -------------------------------------------------------------------
  // clearToken()
  // -------------------------------------------------------------------
  describe('clearToken()', () => {
    it('should set token and user to null', async () => {
      const service = createService({
        token: createValidJwt(),
        user: createMockUser(),
      });

      service.clearToken();

      const token = await service.getToken();
      expect(token).toBeNull();
    });

    it('should cause getCurrentUserObj to return null', () => {
      const service = createService({
        token: createValidJwt(),
        user: createMockUser(),
      });

      service.clearToken();

      expect(service.getCurrentUserObj()).toBeNull();
    });

    it('should cause refreshToken to return null', async () => {
      const service = createService({
        token: createValidJwt(),
        user: createMockUser(),
      });

      service.clearToken();

      const result = await service.refreshToken();
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------
  // getCurrentUserObj()
  // -------------------------------------------------------------------
  describe('getCurrentUserObj()', () => {
    it('should return null when no user is set', () => {
      const service = createService({ user: null });

      expect(service.getCurrentUserObj()).toBeNull();
    });

    it('should return UserData with all fields populated', () => {
      const service = createService({
        user: createMockUser({
          displayName: 'John Doe',
          email: 'john@example.com',
          photoURL: 'https://example.com/john.jpg',
        }),
      });

      const result = service.getCurrentUserObj();
      expect(result).toEqual({
        displayName: 'John Doe',
        email: 'john@example.com',
        photoURL: 'https://example.com/john.jpg',
      } as UserData);
    });

    it('should use empty string when displayName is null', () => {
      const service = createService({
        user: createMockUser({ displayName: null }),
      });

      const result = service.getCurrentUserObj();
      expect(result!.displayName).toBe('');
    });

    it('should use empty string when email is null', () => {
      const service = createService({
        user: createMockUser({ email: null }),
      });

      const result = service.getCurrentUserObj();
      expect(result!.email).toBe('');
    });

    it('should use placeholder image when photoURL is null', () => {
      const service = createService({
        user: createMockUser({ photoURL: null }),
      });

      const result = service.getCurrentUserObj();
      expect(result!.photoURL).toBe(userPlaceholderImage);
    });

    it('should use placeholder image when photoURL is empty string', () => {
      const service = createService({
        user: createMockUser({ photoURL: '' }),
      });

      const result = service.getCurrentUserObj();
      expect(result!.photoURL).toBe(userPlaceholderImage);
    });

    it('should preserve actual photoURL when provided', () => {
      const service = createService({
        user: createMockUser({
          photoURL: 'https://lh3.googleusercontent.com/photo.jpg',
        }),
      });

      const result = service.getCurrentUserObj();
      expect(result!.photoURL).toBe('https://lh3.googleusercontent.com/photo.jpg');
    });
  });

  // -------------------------------------------------------------------
  // Constructor coverage: instantiate the real service with a temporary
  // Firebase app so getAuth()/onAuthStateChanged() execute fully.
  // The onAuthStateChanged callback fires asynchronously with null user
  // (since nobody is signed in), covering the constructor body +
  // callback + else-branch for null user + resolveAuthReady path.
  // -------------------------------------------------------------------
  describe('constructor (real Firebase)', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let testApp: any;

    beforeEach(() => {
      // Initialize a temporary Firebase app if none exists yet
      const apps = getApps();
      if (apps.length === 0) {
        testApp = initializeApp({
          apiKey: 'fake-api-key',
          projectId: 'test-project',
        });
      } else {
        testApp = apps[0];
      }
    });

    it('should create an instance and resolve authReady', async () => {
      const service = new TokenService();
      expect(service).toBeDefined();
      expect(service.authReady).toBeDefined();

      // Wait for the onAuthStateChanged callback to fire (async)
      await service.authReady;

      // No user signed in, so getToken should return null
      const token = await service.getToken();
      expect(token).toBeNull();

      // getCurrentUserObj should be null
      expect(service.getCurrentUserObj()).toBeNull();
    });

    it('should set token to null when no user is signed in', async () => {
      const service = new TokenService();
      await service.authReady;

      // refreshToken with no user should return null
      const refreshed = await service.refreshToken();
      expect(refreshed).toBeNull();
    });
  });

  // -------------------------------------------------------------------
  // authReady integration (ensures the awaits actually work)
  // -------------------------------------------------------------------
  describe('authReady integration', () => {
    it('getToken waits for authReady before proceeding', async () => {
      const service = createService({ token: null, user: null, authResolved: false });
      // Grab the resolver so we can resolve manually
      // The createService with authResolved=false already stored the resolver in resolveAuthReady

      // Start the getToken call (it will block on authReady)
      let finished = false;
      const tokenPromise = service.getToken().then(t => {
        finished = true;
        return t;
      });

      // Not yet resolved
      await Promise.resolve(); // one microtask
      expect(finished).toBe(false);

      // Resolve authReady
      const resolver = (service as any).resolveAuthReady;
      if (resolver) resolver();

      const result = await tokenPromise;
      expect(finished).toBe(true);
      expect(result).toBeNull();
    });

    it('refreshToken waits for authReady', async () => {
      const service = createService({ user: null, authResolved: false });

      let finished = false;
      const refreshPromise = service.refreshToken().then(t => {
        finished = true;
        return t;
      });

      await Promise.resolve();
      expect(finished).toBe(false);

      const resolver = (service as any).resolveAuthReady;
      if (resolver) resolver();

      const result = await refreshPromise;
      expect(finished).toBe(true);
      expect(result).toBeNull();
    });
  });
});
