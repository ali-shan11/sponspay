// Firebase Auth Mock exports
export {
  MockFirebaseAuth,
  MockGoogleAuthProvider,
  createMockFirebaseAuth,
  createMockUser,
  createMockCredential,
  MockAuthErrors,
  type MockUser,
  type MockUserCredential,
  type MockAuthCredential,
  type MockIdTokenResult
} from './firebase-auth.mock';

// Storage Mock exports
export {
  MockStorage,
  createMockLocalStorage,
  createMockSessionStorage,
  createMockStorageWithData,
  mockGlobalLocalStorage,
  mockGlobalSessionStorage,
  StorageTestScenarios
} from './storage.mock';

// HTTP Mock exports
export {
  MockHttpClient,
  createMockHttpClient,
  createMockHttpClientWithResponses,
  HttpTestScenarios,
  createApiUrl,
  type HttpRequestRecord,
  type MockHttpResponse,
  type MockHttpError
} from './http.mock';

// Services Mock exports
export {
  MockSessionStorageService,
  MockLoadingStateService,
  MockSidenavService,
  MockMockDataService,
  MockZohoSalesiqService,
  createMockSessionStorageService,
  createMockLoadingStateService,
  createMockSidenavService,
  createMockMockDataService,
  createMockZohoSalesiqService,
  createAllMockServices,
  ServiceTestScenarios
} from './services.mock';
