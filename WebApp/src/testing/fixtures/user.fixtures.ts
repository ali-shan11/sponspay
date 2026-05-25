import { MockUser, MockUserCredential, MockAuthCredential, MockIdTokenResult } from '../mocks/firebase-auth.mock';

/**
 * Pre-defined mock users for consistent testing scenarios
 */
export const mockUsers = {
  /**
   * Standard authenticated user with complete profile
   */
  authenticatedUser: {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test Creator',
    photoURL: 'https://lh3.googleusercontent.com/a/test-photo',
    emailVerified: true,
    getIdToken: async (): Promise<string> => mockTokens.validToken,
    getIdTokenResult: async (): Promise<MockIdTokenResult> => mockTokenResults.valid
  } as MockUser,

  /**
   * User without email (edge case)
   */
  userWithoutEmail: {
    uid: 'test-user-456',
    email: null,
    displayName: 'Anonymous Creator',
    photoURL: null,
    emailVerified: false,
    getIdToken: async (): Promise<string> => mockTokens.validToken,
    getIdTokenResult: async (): Promise<MockIdTokenResult> => mockTokenResults.valid
  } as MockUser,

  /**
   * User with unverified email
   */
  unverifiedUser: {
    uid: 'test-user-789',
    email: 'unverified@example.com',
    displayName: 'Unverified Creator',
    photoURL: 'https://lh3.googleusercontent.com/a/unverified-photo',
    emailVerified: false,
    getIdToken: async (): Promise<string> => mockTokens.validToken,
    getIdTokenResult: async (): Promise<MockIdTokenResult> => mockTokenResults.valid
  } as MockUser,

  /**
   * User with expired token
   */
  userWithExpiredToken: {
    uid: 'test-user-expired',
    email: 'expired@example.com',
    displayName: 'Expired Token User',
    photoURL: 'https://lh3.googleusercontent.com/a/expired-photo',
    emailVerified: true,
    getIdToken: async (forceRefresh?: boolean): Promise<string> => {
      if (!forceRefresh) {
        throw new Error('Token expired');
      }
      return mockTokens.refreshedToken;
    },
    getIdTokenResult: async (forceRefresh?: boolean): Promise<MockIdTokenResult> => {
      if (!forceRefresh) {
        throw new Error('Token expired');
      }
      return mockTokenResults.refreshed;
    }
  } as MockUser,

  /**
   * Null user (unauthenticated state)
   */
  unauthenticatedUser: null
};

/**
 * Mock JWT tokens for testing authentication scenarios
 */
export const mockTokens = {
  /**
   * Valid JWT token with 1 hour expiration
   */
  validToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vdGVzdC1wcm9qZWN0IiwiYXVkIjoidGVzdC1wcm9qZWN0IiwiYXV0aF90aW1lIjoxNzM1NDEwMDAwLCJ1c2VyX2lkIjoidGVzdC11c2VyLTEyMyIsInN1YiI6InRlc3QtdXNlci0xMjMiLCJpYXQiOjE3MzU0MTAwMDAsImV4cCI6MTczNTQxMzYwMCwiZW1haWwiOiJjcmVhdG9yQGV4YW1wbGUuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyJ0ZXN0LWdvb2dsZS1pZCJdLCJlbWFpbCI6WyJjcmVhdG9yQGV4YW1wbGUuY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9fQ.mock-signature',

  /**
   * Expired JWT token (past expiration time)
   */
  expiredToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vdGVzdC1wcm9qZWN0IiwiYXVkIjoidGVzdC1wcm9qZWN0IiwiYXV0aF90aW1lIjoxNzM1NDA2NDAwLCJ1c2VyX2lkIjoidGVzdC11c2VyLTEyMyIsInN1YiI6InRlc3QtdXNlci0xMjMiLCJpYXQiOjE3MzU0MDY0MDAsImV4cCI6MTczNTQxMDAwMCwiZW1haWwiOiJjcmVhdG9yQGV4YW1wbGUuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyJ0ZXN0LWdvb2dsZS1pZCJdLCJlbWFpbCI6WyJjcmVhdG9yQGV4YW1wbGUuY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9fQ.mock-signature',

  /**
   * Refreshed token after silent refresh
   */
  refreshedToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vdGVzdC1wcm9qZWN0IiwiYXVkIjoidGVzdC1wcm9qZWN0IiwiYXV0aF90aW1lIjoxNzM1NDEwMDAwLCJ1c2VyX2lkIjoidGVzdC11c2VyLTEyMyIsInN1YiI6InRlc3QtdXNlci0xMjMiLCJpYXQiOjE3MzU0MTM2MDAsImV4cCI6MTczNTQxNzIwMCwiZW1haWwiOiJjcmVhdG9yQGV4YW1wbGUuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyJ0ZXN0LWdvb2dsZS1pZCJdLCJlbWFpbCI6WyJjcmVhdG9yQGV4YW1wbGUuY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9fQ.mock-signature',

  /**
   * Invalid token format
   */
  invalidToken: 'invalid-token-format'
};

/**
 * Mock ID token results for testing token validation
 */
export const mockTokenResults = {
  /**
   * Valid token result with claims
   */
  valid: {
    token: mockTokens.validToken,
    expirationTime: '2024-12-28T15:00:00.000Z',
    authTime: '2024-12-28T14:00:00.000Z',
    issuedAtTime: '2024-12-28T14:00:00.000Z',
    signInProvider: 'google.com',
    signInSecondFactor: null,
    claims: {
      iss: 'https://securetoken.google.com/test-project',
      aud: 'test-project',
      auth_time: 1735410000,
      user_id: 'test-user-123',
      sub: 'test-user-123',
      iat: 1735410000,
      exp: 1735413600,
      email: 'test@example.com',
      email_verified: true,
      firebase: {
        identities: {
          'google.com': ['test-google-id'],
          email: ['test@example.com']
        },
        sign_in_provider: 'google.com'
      }
    }
  } as MockIdTokenResult,

  /**
   * Refreshed token result
   */
  refreshed: {
    token: mockTokens.refreshedToken,
    expirationTime: '2024-12-28T16:00:00.000Z',
    authTime: '2024-12-28T14:00:00.000Z',
    issuedAtTime: '2024-12-28T15:00:00.000Z',
    signInProvider: 'google.com',
    signInSecondFactor: null,
    claims: {
      iss: 'https://securetoken.google.com/test-project',
      aud: 'test-project',
      auth_time: 1735410000,
      user_id: 'test-user-123',
      sub: 'test-user-123',
      iat: 1735413600,
      exp: 1735417200,
      email: 'creator@example.com',
      email_verified: true,
      firebase: {
        identities: {
          'google.com': ['test-google-id'],
          email: ['creator@example.com']
        },
        sign_in_provider: 'google.com'
      }
    }
  } as MockIdTokenResult
};

/**
 * Mock user credentials for authentication flow testing
 */
export const mockCredentials = {
  /**
   * Successful popup authentication result
   */
  popupSuccess: {
    user: mockUsers.authenticatedUser,
    credential: {
      accessToken: 'ya29.mock-access-token',
      idToken: mockTokens.validToken,
      providerId: 'google.com',
      signInMethod: 'google.com'
    } as MockAuthCredential,
    operationType: 'signIn'
  } as MockUserCredential,

  /**
   * Successful redirect authentication result
   */
  redirectSuccess: {
    user: mockUsers.authenticatedUser,
    credential: {
      accessToken: 'ya29.mock-access-token-redirect',
      idToken: mockTokens.validToken,
      providerId: 'google.com',
      signInMethod: 'google.com'
    } as MockAuthCredential,
    operationType: 'signIn'
  } as MockUserCredential,

  /**
   * Null credential (no authentication occurred)
   */
  noAuth: null
};

// Factory Functions

/**
 * Create a custom mock user with specific properties
 */
export function createMockUser(overrides?: Partial<MockUser>): MockUser {
  const baseUser = mockUsers.authenticatedUser;
  const customUser = { ...baseUser, ...overrides };
  
  return {
    ...customUser,
    getIdToken: async (forceRefresh?: boolean): Promise<string> => {
      if (overrides?.uid === 'test-user-expired' && !forceRefresh) {
        throw new Error('Token expired');
      }
      return mockTokens.validToken;
    },
    getIdTokenResult: async (forceRefresh?: boolean): Promise<MockIdTokenResult> => {
      if (overrides?.uid === 'test-user-expired' && !forceRefresh) {
        throw new Error('Token expired');
      }
      return mockTokenResults.valid;
    }
  };
}

/**
 * Create a mock token with custom claims
 */
export function createMockToken(claims?: Record<string, any>): string {
  const defaultClaims = {
    iss: 'https://securetoken.google.com/test-project',
    aud: 'test-project',
    auth_time: Math.floor(Date.now() / 1000),
    user_id: 'test-user-123',
    sub: 'test-user-123',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: 'creator@example.com',
    email_verified: true,
    firebase: {
      identities: {
        'google.com': ['test-google-id'],
        email: ['creator@example.com']
      },
      sign_in_provider: 'google.com'
    }
  };

  const tokenClaims = { ...defaultClaims, ...claims };
  
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify(tokenClaims));
  const signature = 'mock-signature';
  
  return `${header}.${payload}.${signature}`;
}

/**
 * Create a mock user credential for authentication testing
 */
export function createMockCredential(
  user?: MockUser,
  accessToken?: string,
  operationType = 'signIn'
): MockUserCredential {
  return {
    user: user || mockUsers.authenticatedUser,
    credential: {
      accessToken: accessToken || 'ya29.mock-access-token',
      idToken: mockTokens.validToken,
      providerId: 'google.com',
      signInMethod: 'google.com'
    },
    operationType
  };
}

/**
 * Create a mock user for specific subscriber count testing
 */
export function createMockUserForSubscriberTesting(subscriberCount: number): MockUser {
  return createMockUser({
    uid: `test-user-${subscriberCount}-subs`,
    email: `creator-${subscriberCount}@example.com`,
    displayName: `Creator with ${subscriberCount} Subscribers`
  });
}
