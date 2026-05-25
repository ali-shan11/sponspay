import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { ContactUsComponent } from './contact-us.component';
import { ContactUsService } from './contact-us.service';
import { AlertService } from '@services/alert.service';
import { createMockHttpClient } from '../../../testing/mocks/http.mock';

describe('ContactUsComponent', () => {
  let component: ContactUsComponent;
  let fixture: ComponentFixture<ContactUsComponent>;
  let mockHttpClient: any;
  let mockAlert: jasmine.SpyObj<AlertService>;
  let contactUsService: ContactUsService;

  beforeEach(async () => {
    mockHttpClient = createMockHttpClient();
    mockAlert = jasmine.createSpyObj('AlertService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [ContactUsComponent, ReactiveFormsModule],
      providers: [
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: AlertService, useValue: mockAlert },
        ContactUsService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ContactUsComponent);
    component = fixture.componentInstance;
    contactUsService = TestBed.inject(ContactUsService);
    fixture.detectChanges();
  });

  describe('Component Lifecycle', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize form controls with proper validators', () => {
      expect(component.contactForm).toBeDefined();
      expect(component.firstName.hasError('required')).toBeTruthy();
      expect(component.lastName.hasError('required')).toBeTruthy();
      expect(component.email.hasError('required')).toBeTruthy();
      expect(component.interest.hasError('required')).toBeTruthy();
      expect(component.message.hasError('required')).toBeTruthy();
    });

    it('should set default country to US', () => {
      expect(component.country.value).toBe('US');
    });

    it('should initialize loading and success states to false', () => {
      expect(component.loading).toBeFalsy();
      expect(component.formSubmittedSuccessfully).toBeFalsy();
    });
  });

  describe('Form Validation Logic', () => {
    it('should validate required fields', () => {
      component.firstName.setValue('');
      component.lastName.setValue('');
      component.email.setValue('');
      component.interest.setValue('');
      component.message.setValue('');

      expect(component.firstName.invalid).toBeTruthy();
      expect(component.lastName.invalid).toBeTruthy();
      expect(component.email.invalid).toBeTruthy();
      expect(component.interest.invalid).toBeTruthy();
      expect(component.message.invalid).toBeTruthy();
      expect(component.isFormValid).toBeFalsy();
    });

    it('should validate minimum length for names', () => {
      component.firstName.setValue('A');
      component.lastName.setValue('B');

      expect(component.firstName.hasError('minlength')).toBeTruthy();
      expect(component.lastName.hasError('minlength')).toBeTruthy();
    });

    it('should validate email format', () => {
      component.email.setValue('invalid-email');
      expect(component.email.hasError('email')).toBeTruthy();

      component.email.setValue('valid@email.com');
      expect(component.email.hasError('email')).toBeFalsy();
    });

    it('should validate message length constraints', () => {
      component.message.setValue('short');
      expect(component.message.hasError('minlength')).toBeTruthy();

      const longMessage = 'a'.repeat(201);
      component.message.setValue(longMessage);
      expect(component.message.hasError('maxlength')).toBeTruthy();

      component.message.setValue('This is a valid message with proper length');
      expect(component.message.valid).toBeTruthy();
    });

    it('should consider form valid when all required fields are filled correctly', () => {
      component.firstName.setValue('John');
      component.lastName.setValue('Doe');
      component.email.setValue('john@example.com');
      component.interest.setValue('creator');
      component.message.setValue('This is a valid message with proper length');

      expect(component.isFormValid).toBeTruthy();
    });

    it('should handle optional phone number validation', () => {
      // Fill required fields
      component.firstName.setValue('John');
      component.lastName.setValue('Doe');
      component.email.setValue('john@example.com');
      component.interest.setValue('creator');
      component.message.setValue('This is a valid message with proper length');

      // Form should be valid without phone number
      expect(component.isFormValid).toBeTruthy();

      // Form should be valid with valid phone number
      component.phoneNumber.setValue('2125551234');
      expect(component.isFormValid).toBeTruthy();
    });
  });

  describe('Phone Number Handling', () => {
    it('should validate phone numbers correctly', () => {
      component.country.setValue('US');
      component.phoneNumber.setValue('2125551234');
      expect(component.isPhoneValid).toBeTruthy();

      component.phoneNumber.setValue('invalid-phone');
      expect(component.isPhoneValid).toBeFalsy();

      component.phoneNumber.setValue('');
      expect(component.isPhoneValid).toBeTruthy(); // Empty phone is valid
    });

    it('should provide phone hint based on country', () => {
      component.country.setValue('US');
      const hint = component.phoneHint;
      expect(hint).toBeTruthy();
      expect(typeof hint).toBe('string');
    });

    it('should format phone numbers correctly', () => {
      component.country.setValue('US');
      component.phoneNumber.setValue('5551234567');
      
      component.formatNumber();
      
      // The formatted number should be in national format
      expect(component.phoneNumber.value).toContain('555');
    });

    it('should handle phone validation with different countries', () => {
      component.country.setValue('GB');
      component.phoneNumber.setValue('020 7946 0958');
      expect(component.isPhoneValid).toBeTruthy();

      component.country.setValue('US');
      component.phoneNumber.setValue('020 7946 0958');
      expect(component.isPhoneValid).toBeFalsy();
    });

    it('should not format invalid phone numbers', () => {
      component.country.setValue('US');
      const invalidPhone = 'invalid-phone';
      component.phoneNumber.setValue(invalidPhone);
      
      component.formatNumber();
      
      expect(component.phoneNumber.value).toBe(invalidPhone);
    });
  });

  describe('Form Submission Flow', () => {
    beforeEach(() => {
      // Set up valid form data
      component.firstName.setValue('John');
      component.lastName.setValue('Doe');
      component.email.setValue('john@example.com');
      component.interest.setValue('creator');
      component.message.setValue('This is a valid message with proper length');
      component.phoneNumber.setValue('(212) 555-1234');
      component.country.setValue('US');
    });

    it('should submit form successfully', fakeAsync(() => {
      const mockResponse = { success: true, message: 'Contact submitted successfully' };
      spyOn(contactUsService, 'contactUs').and.returnValue(of(mockResponse as any));
      spyOn(component as any, 'resetForm');

      component.onSubmit();

      expect(contactUsService.contactUs).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        interest: 'creator',
        message: 'This is a valid message with proper length',
        phoneNumber: '+12125551234', // E164 format
        country: 'United States of America'
      });

      tick(); // Process the observable

      expect(mockAlert.success).toHaveBeenCalledWith('Success', 'Message sent successfully!');
      expect(component.loading).toBeFalsy();
      expect(component.formSubmittedSuccessfully).toBeTruthy();
      expect((component as any).resetForm).toHaveBeenCalled();
    }));

    it('should handle submission errors', fakeAsync(() => {
      const mockError = { error: { message: 'Server error occurred' } };
      spyOn(contactUsService, 'contactUs').and.returnValue(throwError(() => mockError));

      component.onSubmit();

      tick(); // Process the observable

      expect(component.loading).toBeFalsy();
      expect(component.formSubmittedSuccessfully).toBeFalsy();
    }));

    it('should handle submission errors without specific message', fakeAsync(() => {
      const mockError = { error: {} };
      spyOn(contactUsService, 'contactUs').and.returnValue(throwError(() => mockError));

      component.onSubmit();

      tick(); // Process the observable

      expect(component.loading).toBeFalsy();
    }));

    it('should prevent submission when form is invalid', () => {
      component.firstName.setValue(''); // Make form invalid
      spyOn(contactUsService, 'contactUs');

      component.onSubmit();

      expect(contactUsService.contactUs).not.toHaveBeenCalled();
      expect(component.loading).toBeFalsy();
    });

    it('should prevent duplicate submissions', () => {
      component.formSubmittedSuccessfully = true;
      spyOn(contactUsService, 'contactUs');

      component.onSubmit();

      expect(contactUsService.contactUs).not.toHaveBeenCalled();
      expect(component.loading).toBeFalsy();
    });

    it('should handle empty phone number correctly in submission', () => {
      component.phoneNumber.setValue('');
      spyOn(contactUsService, 'contactUs').and.returnValue(of({} as any));

      component.onSubmit();

      expect(contactUsService.contactUs).toHaveBeenCalledWith(
        jasmine.objectContaining({
          phoneNumber: ''
        })
      );
    });

    it('should ensure loading is false in complete callback', fakeAsync(() => {
      spyOn(contactUsService, 'contactUs').and.returnValue(of({} as any));
      component.loading = true;

      component.onSubmit();

      tick(); // Process the observable

      expect(component.loading).toBeFalsy();
    }));
  });

  describe('User Experience & Edge Cases', () => {
    it('should reset form correctly', () => {
      // Fill form with data
      component.firstName.setValue('John');
      component.lastName.setValue('Doe');
      component.email.setValue('john@example.com');
      component.interest.setValue('creator');
      component.message.setValue('Test message');

      // Call private resetForm method
      (component as any).resetForm();

      // Form should be reset
      expect(component.contactForm.pristine).toBeTruthy();
    });

    it('should handle country code changes', () => {
      component.country.setValue('US');
      const usHint = component.phoneHint;

      component.country.setValue('GB');
      const gbHint = component.phoneHint;

      expect(usHint).not.toBe(gbHint);
    });

    it('should maintain form state during loading', () => {
      component.firstName.setValue('John');
      component.loading = true;

      expect(component.firstName.value).toBe('John');
      expect(component.loading).toBeTruthy();
    });

    it('should handle form validation state changes', () => {
      expect(component.isFormValid).toBeFalsy();

      // Fill required fields
      component.firstName.setValue('John');
      component.lastName.setValue('Doe');
      component.email.setValue('john@example.com');
      component.interest.setValue('creator');
      component.message.setValue('This is a valid message with proper length');

      expect(component.isFormValid).toBeTruthy();

      // Make form invalid again
      component.email.setValue('invalid-email');
      expect(component.isFormValid).toBeFalsy();
    });

    it('should handle country codes array', () => {
      expect(component.countyCodes).toBeDefined();
      expect(Array.isArray(component.countyCodes)).toBeTruthy();
      expect(component.countyCodes.length).toBeGreaterThan(0);
    });
  });

  describe('Template Integration', () => {
    it('should display form elements', () => {
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('form')).toBeTruthy();
      expect(compiled.querySelector('app-custom-input')).toBeTruthy();
      expect(compiled.querySelector('app-custom-select')).toBeTruthy();
      expect(compiled.querySelector('app-custom-textarea')).toBeTruthy();
    });

    it('should show validation errors in template', () => {
      component.firstName.setValue('');
      component.firstName.markAsTouched();
      fixture.detectChanges();

      expect(component.firstName.invalid).toBeTruthy();
      expect(component.isFormValid).toBeFalsy();
    });
  });
});
