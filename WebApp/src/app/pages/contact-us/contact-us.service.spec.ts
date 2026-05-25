import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { ContactUsService, ContactUs } from './contact-us.service';
import { environment } from '../../../environments/environment';
import { createMockHttpClient } from '../../../testing/mocks/http.mock';
import { APP_ENDPOINTS } from '@utils/urls';

describe('ContactUsService', () => {
  let service: ContactUsService;
  let mockHttpClient: any;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();

    TestBed.configureTestingModule({
      providers: [
        ContactUsService,
        { provide: HttpClient, useValue: mockHttpClient }
      ]
    });
    service = TestBed.inject(ContactUsService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should inject HttpClient dependency', () => {
      expect(mockHttpClient).toBeTruthy();
    });
  });

  describe('API Integration', () => {
    const mockContactData: ContactUs = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phoneNumber: '+15551234567',
      message: 'This is a test message for the contact form',
      interest: 'creator',
      country: 'US'
    };

    it('should submit contact form data successfully', () => {
      const mockResponse = { success: true, message: 'Contact submitted successfully' };
      spyOn(mockHttpClient, 'post').and.returnValue(of(mockResponse));

      service.contactUs(mockContactData).subscribe(response => {
        expect(response).toEqual(mockResponse as any);
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        environment.API_BASE + APP_ENDPOINTS.CONTACT_US,
        mockContactData
      );
    });

    it('should use correct API endpoint', () => {
      const mockResponse = { success: true };
      spyOn(mockHttpClient, 'post').and.returnValue(of(mockResponse));

      service.contactUs(mockContactData).subscribe();

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        `${environment.API_BASE + APP_ENDPOINTS.CONTACT_US}`,
        jasmine.any(Object)
      );
    });

    it('should send complete form data in request', () => {
      const mockResponse = { success: true };
      spyOn(mockHttpClient, 'post').and.returnValue(of(mockResponse));

      service.contactUs(mockContactData).subscribe();

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        jasmine.any(String),
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phoneNumber: '+15551234567',
          message: 'This is a test message for the contact form',
          interest: 'creator',
          country: 'US'
        }
      );
    });

    it('should handle different contact data variations', () => {
      const variation1 = {
        ...mockContactData,
        phoneNumber: '', // Empty phone number
        interest: 'fan'
      };
      
      const mockResponse1 = { success: true, id: 1 };
      spyOn(mockHttpClient, 'post').and.returnValue(of(mockResponse1));

      service.contactUs(variation1).subscribe(response => {
        expect(response).toEqual(mockResponse1 as any);
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        jasmine.any(String),
        variation1
      );
    });

    it('should handle GB country with different phone format', () => {
      const variation2 = {
        ...mockContactData,
        country: 'GB',
        phoneNumber: '+442079460958'
      };
      
      const mockResponse2 = { success: true, id: 2 };
      spyOn(mockHttpClient, 'post').and.returnValue(of(mockResponse2));

      service.contactUs(variation2).subscribe(response => {
        expect(response).toEqual(mockResponse2 as any);
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        jasmine.any(String),
        variation2
      );
    });

    it('should handle maximum length message', () => {
      const variation3 = {
        ...mockContactData,
        message: 'A'.repeat(200) // Maximum length message
      };
      
      const mockResponse3 = { success: true, id: 3 };
      spyOn(mockHttpClient, 'post').and.returnValue(of(mockResponse3));

      service.contactUs(variation3).subscribe(response => {
        expect(response).toEqual(mockResponse3 as any);
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        jasmine.any(String),
        variation3
      );
    });
  });

  describe('Error Handling', () => {
    const mockContactData: ContactUs = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phoneNumber: '+15551234567',
      message: 'Test message',
      interest: 'creator',
      country: 'US'
    };

    it('should handle server errors (500)', () => {
      const errorResponse = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error',
        error: { message: 'Server error occurred' }
      });

      spyOn(mockHttpClient, 'post').and.returnValue(throwError(() => errorResponse));

      service.contactUs(mockContactData).subscribe({
        next: () => fail('Expected error, but got success'),
        error: (error) => {
          expect(error.status).toBe(500);
          expect(error.statusText).toBe('Internal Server Error');
        }
      });
    });

    it('should handle client errors (400)', () => {
      const errorResponse = new HttpErrorResponse({
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Invalid form data' }
      });

      spyOn(mockHttpClient, 'post').and.returnValue(throwError(() => errorResponse));

      service.contactUs(mockContactData).subscribe({
        next: () => fail('Expected error, but got success'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.statusText).toBe('Bad Request');
        }
      });
    });

    it('should handle unauthorized errors (401)', () => {
      const errorResponse = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
        error: { message: 'Authentication required' }
      });

      spyOn(mockHttpClient, 'post').and.returnValue(throwError(() => errorResponse));

      service.contactUs(mockContactData).subscribe({
        next: () => fail('Expected error, but got success'),
        error: (error) => {
          expect(error.status).toBe(401);
          expect(error.statusText).toBe('Unauthorized');
        }
      });
    });

    it('should handle network errors', () => {
      const errorResponse = new HttpErrorResponse({
        status: 0,
        statusText: 'Network Error',
        error: new Error('Network connection failed')
      });

      spyOn(mockHttpClient, 'post').and.returnValue(throwError(() => errorResponse));

      service.contactUs(mockContactData).subscribe({
        next: () => fail('Expected error, but got success'),
        error: (error) => {
          expect(error.status).toBe(0);
          expect(error.statusText).toBe('Network Error');
        }
      });
    });

    it('should handle timeout errors', () => {
      const errorResponse = new HttpErrorResponse({
        status: 408,
        statusText: 'Request Timeout',
        error: { message: 'Request timed out' }
      });

      spyOn(mockHttpClient, 'post').and.returnValue(throwError(() => errorResponse));

      service.contactUs(mockContactData).subscribe({
        next: () => fail('Expected error, but got success'),
        error: (error) => {
          expect(error.status).toBe(408);
          expect(error.statusText).toBe('Request Timeout');
        }
      });
    });
  });

  describe('Data Validation', () => {
    it('should accept valid ContactUs interface data', () => {
      const validData: ContactUs = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phoneNumber: '+447946123456',
        message: 'I am interested in learning more about SponsPay for my YouTube channel.',
        interest: 'creator',
        country: 'GB'
      };

      const mockResponse = { success: true };
      spyOn(mockHttpClient, 'post').and.returnValue(of(mockResponse));

      service.contactUs(validData).subscribe(response => {
        expect(response).toEqual(mockResponse as any);
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        jasmine.any(String),
        validData
      );
    });

    it('should handle empty optional fields', () => {
      const dataWithEmptyPhone: ContactUs = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phoneNumber: '', // Empty phone number
        message: 'Test message without phone number',
        interest: 'fan',
        country: 'US'
      };

      const mockResponse = { success: true };
      spyOn(mockHttpClient, 'post').and.returnValue(of(mockResponse));

      service.contactUs(dataWithEmptyPhone).subscribe(response => {
        expect(response).toEqual(mockResponse as any);
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        jasmine.any(String),
        dataWithEmptyPhone
      );
    });
  });

  describe('Response Handling', () => {
    const mockContactData: ContactUs = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phoneNumber: '+15551234567',
      message: 'Test message',
      interest: 'creator',
      country: 'US'
    };

    it('should handle successful response with message', () => {
      const mockResponse = {
        success: true,
        message: 'Thank you for contacting us! We will get back to you soon.',
        id: 'contact-123'
      };

      spyOn(mockHttpClient, 'post').and.returnValue(of(mockResponse));

      service.contactUs(mockContactData).subscribe(response => {
        expect((response as any).success).toBe(true);
        expect((response as any).message).toContain('Thank you');
        expect((response as any).id).toBe('contact-123');
      });
    });

    it('should handle response without success flag', () => {
      const mockResponse = {
        message: 'Contact received',
        timestamp: '2024-01-01T00:00:00Z'
      };

      spyOn(mockHttpClient, 'post').and.returnValue(of(mockResponse));

      service.contactUs(mockContactData).subscribe(response => {
        expect((response as any).message).toBe('Contact received');
        expect((response as any).timestamp).toBeDefined();
      });
    });

    it('should handle minimal response', () => {
      const mockResponse = { id: 'contact-456' };

      spyOn(mockHttpClient, 'post').and.returnValue(of(mockResponse));

      service.contactUs(mockContactData).subscribe(response => {
        expect((response as any).id).toBe('contact-456');
      });
    });

    it('should handle response with additional metadata', () => {
      const mockResponse = {
        success: true,
        message: 'Contact submitted successfully',
        data: {
          contactId: 'contact-789',
          submittedAt: '2024-01-01T12:00:00Z',
          estimatedResponseTime: '24 hours'
        }
      };

      spyOn(mockHttpClient, 'post').and.returnValue(of(mockResponse));

      service.contactUs(mockContactData).subscribe(response => {
        expect((response as any).success).toBe(true);
        expect((response as any).data).toBeDefined();
        expect((response as any).data.contactId).toBe('contact-789');
      });
    });
  });
});
