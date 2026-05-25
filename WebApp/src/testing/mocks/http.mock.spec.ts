import { MockHttpClient, createMockHttpClient, createMockHttpClientWithResponses, HttpTestScenarios, createApiUrl } from './http.mock';
import { HttpErrorResponse } from '@angular/common/http';

describe('MockHttpClient', () => {
  let httpClient: MockHttpClient;

  beforeEach(() => {
    httpClient = new MockHttpClient();
  });

  describe('HTTP Methods', () => {
    it('should support GET requests', (done) => {
      const testData = { message: 'test response' };
      httpClient.setMockResponse('/api/test', testData);

      httpClient.get('/api/test').subscribe({
        next: (response) => {
          expect(response).toEqual(testData);
          done();
        },
        error: done.fail
      });
    });

    it('should support POST requests', (done) => {
      const testData = { success: true };
      const requestBody = { name: 'test' };
      httpClient.setMockResponse('/api/create', testData);

      httpClient.post('/api/create', requestBody).subscribe({
        next: (response) => {
          expect(response).toEqual(testData);
          const lastRequest = httpClient.getLastRequest();
          expect(lastRequest?.method).toBe('POST');
          expect(lastRequest?.body).toEqual(requestBody);
          done();
        },
        error: done.fail
      });
    });

    it('should support PUT requests', (done) => {
      const testData = { updated: true };
      const requestBody = { id: 1, name: 'updated' };
      httpClient.setMockResponse('/api/update/1', testData);

      httpClient.put('/api/update/1', requestBody).subscribe({
        next: (response) => {
          expect(response).toEqual(testData);
          expect(httpClient.wasRequestMade('PUT', '/api/update/1')).toBe(true);
          done();
        },
        error: done.fail
      });
    });

    it('should support DELETE requests', (done) => {
      const testData = { deleted: true };
      httpClient.setMockResponse('/api/delete/1', testData);

      httpClient.delete('/api/delete/1').subscribe({
        next: (response) => {
          expect(response).toEqual(testData);
          expect(httpClient.wasRequestMade('DELETE', '/api/delete/1')).toBe(true);
          done();
        },
        error: done.fail
      });
    });

    it('should support PATCH requests', (done) => {
      const testData = { patched: true };
      const requestBody = { field: 'value' };
      httpClient.setMockResponse('/api/patch/1', testData);

      httpClient.patch('/api/patch/1', requestBody).subscribe({
        next: (response) => {
          expect(response).toEqual(testData);
          expect(httpClient.wasRequestMade('PATCH', '/api/patch/1')).toBe(true);
          done();
        },
        error: done.fail
      });
    });
  });

  describe('Error Handling', () => {
    it('should return mock errors', (done) => {
      const mockError = {
        status: 404,
        statusText: 'Not Found',
        message: 'Resource not found'
      };
      httpClient.setMockError('/api/notfound', mockError);

      httpClient.get('/api/notfound').subscribe({
        next: () => done.fail('Should have thrown error'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(404);
          expect(error.statusText).toBe('Not Found');
          done();
        }
      });
    });

    it('should handle Error objects', (done) => {
      const error = new Error('Test error');
      httpClient.setMockError('/api/error', error);

      httpClient.get('/api/error').subscribe({
        next: () => done.fail('Should have thrown error'),
        error: (httpError: HttpErrorResponse) => {
          expect(httpError.status).toBe(500);
          expect(httpError.statusText).toBe('Internal Server Error');
          done();
        }
      });
    });

    it('should return 404 for unconfigured URLs', (done) => {
      httpClient.get('/api/unconfigured').subscribe({
        next: () => done.fail('Should have thrown error'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(404);
          expect(error.statusText).toBe('Not Found');
          expect(error.error).toContain('No mock configured');
          done();
        }
      });
    });
  });

  describe('Request History', () => {
    it('should track request history', () => {
      httpClient.setMockResponse('/api/test1', { data: 1 });
      httpClient.setMockResponse('/api/test2', { data: 2 });

      httpClient.get('/api/test1').subscribe();
      httpClient.post('/api/test2', { body: 'test' }).subscribe();

      const history = httpClient.getRequestHistory();
      expect(history.length).toBe(2);
      expect(history[0].method).toBe('GET');
      expect(history[0].url).toBe('/api/test1');
      expect(history[1].method).toBe('POST');
      expect(history[1].url).toBe('/api/test2');
      expect(history[1].body).toEqual({ body: 'test' });
    });

    it('should filter requests by method', () => {
      httpClient.setMockResponse('/api/get', { data: 1 });
      httpClient.setMockResponse('/api/post', { data: 2 });

      httpClient.get('/api/get').subscribe();
      httpClient.post('/api/post', {}).subscribe();
      httpClient.get('/api/get').subscribe();

      const getRequests = httpClient.getRequestsByMethod('GET');
      const postRequests = httpClient.getRequestsByMethod('POST');

      expect(getRequests.length).toBe(2);
      expect(postRequests.length).toBe(1);
    });

    it('should filter requests by URL pattern', () => {
      httpClient.setMockResponse('/api/users/1', { id: 1 });
      httpClient.setMockResponse('/api/users/2', { id: 2 });
      httpClient.setMockResponse('/api/posts/1', { id: 1 });

      httpClient.get('/api/users/1').subscribe();
      httpClient.get('/api/users/2').subscribe();
      httpClient.get('/api/posts/1').subscribe();

      const userRequests = httpClient.getRequestsByUrl('/api/users');
      const regexRequests = httpClient.getRequestsByUrl(/\/api\/users\/\d+/);

      expect(userRequests.length).toBe(2);
      expect(regexRequests.length).toBe(2);
    });

    it('should get last request', () => {
      httpClient.setMockResponse('/api/first', { data: 1 });
      httpClient.setMockResponse('/api/last', { data: 2 });

      httpClient.get('/api/first').subscribe();
      httpClient.get('/api/last').subscribe();

      const lastRequest = httpClient.getLastRequest();
      expect(lastRequest?.url).toBe('/api/last');
    });

    it('should reset history', () => {
      httpClient.setMockResponse('/api/test', { data: 1 });
      httpClient.get('/api/test').subscribe();

      expect(httpClient.getRequestHistory().length).toBe(1);

      httpClient.resetHistory();
      expect(httpClient.getRequestHistory().length).toBe(0);
    });
  });

  describe('Test Utilities', () => {
    it('should clear all mocks', () => {
      httpClient.setMockResponse('/api/test', { data: 1 });
      httpClient.setMockError('/api/error', { status: 500 });
      httpClient.get('/api/test').subscribe();

      httpClient.clearMocks();

      expect(httpClient.getRequestHistory().length).toBe(0);
      
      // Should return 404 for previously configured URL
      httpClient.get('/api/test').subscribe({
        next: () => fail('Should return 404'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(404);
        }
      });
    });

    it('should support delay for testing loading states', (done) => {
      const startTime = Date.now();
      httpClient.setDefaultDelay(100);
      httpClient.setMockResponse('/api/delayed', { data: 'delayed' });

      httpClient.get('/api/delayed').subscribe({
        next: (response) => {
          const elapsed = Date.now() - startTime;
          expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some variance
          expect(response).toEqual({ data: 'delayed' });
          done();
        },
        error: done.fail
      });
    });
  });

  describe('Factory Functions', () => {
    it('should create basic mock client', () => {
      const client = createMockHttpClient();
      expect(client).toBeInstanceOf(MockHttpClient);
      expect(client.getRequestHistory().length).toBe(0);
    });

    it('should create client with predefined responses', () => {
      const responses = {
        '/api/test1': { data: 1 },
        '/api/test2': { data: 2 }
      };
      const client = createMockHttpClientWithResponses(responses);

      client.get('/api/test1').subscribe(response => {
        expect(response).toEqual({ data: 1 });
      });

      client.get('/api/test2').subscribe(response => {
        expect(response).toEqual({ data: 2 });
      });
    });
  });

  describe('Test Scenarios', () => {
    it('should provide success scenarios', () => {
      const contactFormResponse = HttpTestScenarios.success.contactForm;
      expect(contactFormResponse.body.success).toBe(true);
      expect(contactFormResponse.status).toBe(200);

      const userProfileResponse = HttpTestScenarios.success.userProfile;
      expect(userProfileResponse.body.id).toBe('user-123');
      expect(userProfileResponse.body.email).toBe('test@example.com');
    });

    it('should provide error scenarios', () => {
      const unauthorizedError = HttpTestScenarios.errors.unauthorized;
      expect(unauthorizedError.status).toBe(401);
      expect(unauthorizedError.statusText).toBe('Unauthorized');

      const serverError = HttpTestScenarios.errors.serverError;
      expect(serverError.status).toBe(500);
      expect(serverError.statusText).toBe('Internal Server Error');
    });
  });

  describe('Helper Functions', () => {
    it('should create API URLs', () => {
      expect(createApiUrl('/users')).toBe('https://api.example.com/users');
      expect(createApiUrl('users')).toBe('https://api.example.com/users');
      expect(createApiUrl('/posts', 'https://custom.api.com')).toBe('https://custom.api.com/posts');
    });
  });
});
