import { Observable, BehaviorSubject } from 'rxjs';

/**
 * Mock user interface matching Firebase User
 */
export interface MockUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  providerId: string;
  emailVerified: boolean;
  isAnonymous: boolean;
  metadata: {
    creationTime?: string;
    lastSignInTime?: string;
  };
  providerData: any[];
  refreshToken: string;
  tenantId: string | null;
  delete(): Promise<void>;
  getIdToken(forceRefresh?: boolean): Promise<string>;
  getIdTokenResult(forceRefresh?: boolean): Promise<MockIdTokenResult>;
  reload(): Promise<void>;
  toJSON(): object;
}

/**
 * Mock user credential interface matching Firebase UserCredential
 */
export interface MockUserCredential {
  user: MockUser;
  credential: MockAuthCredential | null;
  operationType: string;
}

/**
 * Mock auth credential interface
 */
export interface MockAuthCredential {
  accessToken?: string;
  idToken?: string;
  providerId: string;
  signInMethod: string;
}

/**
 * Mock ID token result interface
 */
export interface MockIdTokenResult {
  token: string;
  expirationTime: string;
  authTime: string;
  issuedAtTime: string;
  signInProvider: string;
  signInSecondFactor: string | null;
  claims: Record<string, any>;
}

/**
 * Mock Google Auth Provider
 */
export class MockGoogleAuthProvider {
  static PROVIDER_ID = 'google.com';
  providerId = 'google.com';
  
  addScope(): this {
    return this;
  }
  
  setCustomParameters(): this {
    return this;
  }
  
  /**
   * Mock credentialFromResult method
   */
  static credentialFromResult(userCredential: MockUserCredential | null): MockAuthCredential | null {
    if (!userCredential) {
      return null;
    }
    return userCredential.credential;
  }
  
  /**
   * Mock credentialFromError method
   */
  static credentialFromError(): MockAuthCredential | null {
    return null;
  }
}

/**
 * Mock Firebase Auth functions that are imported directly
 */
export const mockAuthState = (auth: any) => {
  if (auth && auth.authState$) {
    return auth.authState$;
  }
  return new BehaviorSubject(null).asObservable();
};

/**
 * Comprehensive Firebase Auth mock for testing authentication flows
 */
export class MockFirebaseAuth {
  private _currentUser: MockUser | null = null;
  private _userSubject = new BehaviorSubject<MockUser | null>(null);
  private _mockError: Error | null = null;
  private _tokenExpired = false;

  /**
   * Current authenticated user
   */
  get currentUser(): MockUser | null {
    return this._currentUser;
  }

  /**
   * Observable auth state changes (Angular Fire compatible)
   */
  get authState$(): Observable<MockUser | null> {
    return this._userSubject.asObservable();
  }

  /**
   * Sign in with popup (localhost/development flow)
   */
  async signInWithPopup(): Promise<MockUserCredential> {
    if (this._mockError) {
      throw this._mockError;
    }

    const mockUser = this.createMockUser();
    const credential = this.createMockCredential();
    
    this.setCurrentUser(mockUser);
    
    return {
      user: mockUser,
      credential,
      operationType: 'signIn'
    };
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    this.setCurrentUser(null);
  }

  /**
   * Auth state change listener (Firebase v9 style)
   */
  onAuthStateChanged(callback: (user: MockUser | null) => void): () => void {
    const subscription = this._userSubject.subscribe(callback);
    return () => subscription.unsubscribe();
  }

  // Test Utilities

  /**
   * Set mock user for testing
   */
  setMockUser(user: MockUser | null): void {
    this.setCurrentUser(user);
  }

  /**
   * Set mock error for testing error scenarios
   */
  setMockError(error: Error | null): void {
    this._mockError = error;
  }

  /**
   * Simulate token expiry for testing refresh scenarios
   */
  simulateTokenExpiry(): void {
    this._tokenExpired = true;
  }

  /**
   * Reset mock to initial state
   */
  resetMock(): void {
    this._currentUser = null;
    this._mockError = null;
    this._tokenExpired = false;
    this._userSubject.next(null);
  }

  // Private Helper Methods

  private setCurrentUser(user: MockUser | null): void {
    this._currentUser = user;
    this._userSubject.next(user);
  }

  private createMockUser(overrides?: Partial<MockUser>): MockUser {
    const defaultUser = {
      uid: 'mock-user-' + Date.now(),
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: 'https://example.com/photo.jpg',
      phoneNumber: null,
      providerId: 'google.com',
      emailVerified: true,
      isAnonymous: false,
      metadata: {
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString()
      },
      providerData: [],
      refreshToken: 'mock-refresh-token',
      tenantId: null,
      delete: async (): Promise<void> => {
        // Mock delete implementation
      },
      reload: async (): Promise<void> => {
        // Mock reload implementation
      },
      toJSON: (): object => {
        return {
          uid: defaultUser.uid,
          email: defaultUser.email,
          displayName: defaultUser.displayName,
          photoURL: defaultUser.photoURL,
          emailVerified: defaultUser.emailVerified
        };
      }
    };

    const userData = { ...defaultUser, ...overrides };

    return {
      ...userData,
      getIdToken: async (forceRefresh?: boolean): Promise<string> => {
        if (this._mockError) {
          throw this._mockError;
        }
        if (this._tokenExpired && !forceRefresh) {
          throw new Error('Token expired');
        }
        return this.generateMockToken();
      },
      getIdTokenResult: async (forceRefresh?: boolean): Promise<MockIdTokenResult> => {
        if (this._mockError) {
          throw this._mockError;
        }
        if (this._tokenExpired && !forceRefresh) {
          throw new Error('Token expired');
        }
        return this.generateMockTokenResult();
      }
    };
  }

  private createMockCredential(): MockAuthCredential {
    return {
      accessToken: this.generateMockToken(),
      idToken: this.generateMockToken(),
      providerId: 'google.com',
      signInMethod: 'google.com'
    };
  }

  private generateMockToken(): string {
    // Generate a realistic-looking JWT token for testing
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      iss: 'https://securetoken.google.com/mock-project',
      aud: 'mock-project',
      auth_time: Math.floor(Date.now() / 1000),
      user_id: this._currentUser?.uid || 'mock-user',
      sub: this._currentUser?.uid || 'mock-user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      email: this._currentUser?.email || 'test@example.com',
      email_verified: true,
      firebase: {
        identities: {
          'google.com': ['mock-google-id'],
          email: [this._currentUser?.email || 'test@example.com']
        },
        sign_in_provider: 'google.com'
      }
    }));
    const signature = 'mock-signature';
    
    return `${header}.${payload}.${signature}`;
  }

  private generateMockTokenResult(): MockIdTokenResult {
    const now = new Date();
    const expiration = new Date(now.getTime() + 3600000); // 1 hour
    
    return {
      token: this.generateMockToken(),
      expirationTime: expiration.toISOString(),
      authTime: now.toISOString(),
      issuedAtTime: now.toISOString(),
      signInProvider: 'google.com',
      signInSecondFactor: null,
      claims: {
        iss: 'https://securetoken.google.com/mock-project',
        aud: 'mock-project',
        auth_time: Math.floor(now.getTime() / 1000),
        user_id: this._currentUser?.uid || 'mock-user',
        sub: this._currentUser?.uid || 'mock-user',
        iat: Math.floor(now.getTime() / 1000),
        exp: Math.floor(expiration.getTime() / 1000),
        email: this._currentUser?.email || 'test@example.com',
        email_verified: true,
        firebase: {
          identities: {
            'google.com': ['mock-google-id'],
            email: [this._currentUser?.email || 'test@example.com']
          },
          sign_in_provider: 'google.com'
        }
      }
    };
  }
}

// Factory functions for common scenarios

/**
 * Create a mock Firebase Auth instance
 */
export function createMockFirebaseAuth(): MockFirebaseAuth {
  return new MockFirebaseAuth();
}

/**
 * Create a mock authenticated user
 */
export function createMockUser(overrides?: Partial<MockUser>): MockUser {
  const auth = new MockFirebaseAuth();
  return auth['createMockUser'](overrides);
}

/**
 * Create mock auth credential
 */
export function createMockCredential(): MockAuthCredential {
  const auth = new MockFirebaseAuth();
  return auth['createMockCredential']();
}

// Common error scenarios for testing

export const MockAuthErrors = {
  POPUP_CLOSED: new Error('auth/popup-closed-by-user'),
  POPUP_BLOCKED: new Error('auth/popup-blocked'),
  CANCELLED: new Error('auth/cancelled-popup-request'),
  NETWORK_ERROR: new Error('auth/network-request-failed'),
  TOKEN_EXPIRED: new Error('auth/id-token-expired'),
  USER_DISABLED: new Error('auth/user-disabled'),
  INVALID_CREDENTIAL: new Error('auth/invalid-credential')
};
