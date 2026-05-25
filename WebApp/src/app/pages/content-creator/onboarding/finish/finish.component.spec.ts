import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { createMockFirebaseAuth } from '../../../../../testing/mocks/firebase-auth.mock';
import { createMockHttpClient } from '../../../../../testing/mocks/http.mock';
import { TokenService } from '@services/token.service';
import { OnboardingService } from '@services/onboarding.service';
import { TermsResponse } from '@app-types/onboarding';

import { FinishComponent } from './finish.component';

describe('FinishComponent', () => {
  let component: FinishComponent;
  let fixture: ComponentFixture<FinishComponent>;
  let mockOnboardingService: jasmine.SpyObj<OnboardingService>;
  let mockSanitizer: jasmine.SpyObj<DomSanitizer>;

  beforeEach(async () => {
    mockOnboardingService = jasmine.createSpyObj('OnboardingService', [
      'getTermsHtml',
      'propagateUser',
      'gotoNextStep',
      'gotoPreviousStep',
      'resetOnboarding',
    ], {
      currentStep: 0,
      integrationStep: 0,
    });

    // Default: getTermsHtml returns a successful response
    const termsResponse: TermsResponse = {
      id: 'terms-1',
      version: 3,
      html: '<p>Terms and conditions content</p>',
      createdAt: '2026-01-01T00:00:00Z',
    };
    mockOnboardingService.getTermsHtml.and.returnValue(of(termsResponse));

    mockSanitizer = jasmine.createSpyObj('DomSanitizer', [
      'bypassSecurityTrustHtml',
      'bypassSecurityTrustStyle',
      'bypassSecurityTrustScript',
      'bypassSecurityTrustUrl',
      'bypassSecurityTrustResourceUrl',
      'sanitize',
    ]);
    mockSanitizer.bypassSecurityTrustHtml.and.callFake((val: string) => val as any);

    await TestBed.configureTestingModule({
      imports: [FinishComponent],
      providers: [
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: HttpClient, useValue: createMockHttpClient() },
        { provide: TokenService, useValue: jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() }) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], { events: of(), url: '/' }) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}), queryParams: of({}) } },
        { provide: OnboardingService, useValue: mockOnboardingService },
        { provide: DomSanitizer, useValue: mockSanitizer },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinishComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call getTerms on init', () => {
      // getTerms is called during fixture.detectChanges() in beforeEach (which triggers ngOnInit)
      expect(mockOnboardingService.getTermsHtml).toHaveBeenCalled();
    });
  });

  describe('getTerms', () => {
    it('should set termsVersion from the response', () => {
      expect(component.termsVersion).toBe(3);
    });

    it('should call bypassSecurityTrustHtml with the response HTML', () => {
      expect(mockSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('<p>Terms and conditions content</p>');
    });

    it('should set termsHtml to the sanitized value', () => {
      // Our mock returns the input string as-is
      expect(component.termsHtml).toBe('<p>Terms and conditions content</p>' as any);
    });

    it('should handle a different terms version correctly', () => {
      const newTerms: TermsResponse = {
        id: 'terms-2',
        version: 7,
        html: '<h1>Updated Terms</h1>',
        createdAt: '2026-02-01T00:00:00Z',
      };
      mockOnboardingService.getTermsHtml.and.returnValue(of(newTerms));

      component.getTerms();

      expect(component.termsVersion).toBe(7);
      expect(mockSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('<h1>Updated Terms</h1>');
    });

    it('should log error when getTermsHtml fails', () => {
      const consoleSpy = spyOn(console, 'error');
      const testError = new Error('Network error');
      mockOnboardingService.getTermsHtml.and.returnValue(throwError(() => testError));

      component.getTerms();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to load terms:', testError);
    });

    it('should not update termsVersion when getTermsHtml fails', () => {
      // termsVersion is already set to 3 from beforeEach init
      const testError = new Error('Server error');
      mockOnboardingService.getTermsHtml.and.returnValue(throwError(() => testError));
      spyOn(console, 'error');

      // Reset termsVersion to check it doesn't change on error
      component.termsVersion = 0;
      component.getTerms();

      expect(component.termsVersion).toBe(0);
    });
  });

  describe('acceptTermsChange', () => {
    it('should emit termsVersion when conditionsAccepted is true', () => {
      spyOn(component.acceptedTerms, 'emit');
      component.conditionsAccepted = true;
      component.termsVersion = 5;

      component.acceptTermsChange();

      expect(component.acceptedTerms.emit).toHaveBeenCalledWith(5);
    });

    it('should emit 0 when conditionsAccepted is false', () => {
      spyOn(component.acceptedTerms, 'emit');
      component.conditionsAccepted = false;
      component.termsVersion = 5;

      component.acceptTermsChange();

      expect(component.acceptedTerms.emit).toHaveBeenCalledWith(0);
    });

    it('should emit the current termsVersion (not a stale value) when accepted', () => {
      spyOn(component.acceptedTerms, 'emit');
      component.conditionsAccepted = true;

      // Simulate terms were loaded with version 3 from beforeEach
      component.acceptTermsChange();
      expect(component.acceptedTerms.emit).toHaveBeenCalledWith(3);

      // Now simulate new terms loaded
      component.termsVersion = 10;
      component.acceptTermsChange();
      expect(component.acceptedTerms.emit).toHaveBeenCalledWith(10);
    });

    it('should emit 0 when toggling conditionsAccepted from true to false', () => {
      spyOn(component.acceptedTerms, 'emit');
      component.termsVersion = 5;

      component.conditionsAccepted = true;
      component.acceptTermsChange();
      expect(component.acceptedTerms.emit).toHaveBeenCalledWith(5);

      component.conditionsAccepted = false;
      component.acceptTermsChange();
      expect(component.acceptedTerms.emit).toHaveBeenCalledWith(0);
    });
  });

  describe('initial state', () => {
    it('should have conditionsAccepted as false initially', () => {
      // The component was created in beforeEach, but conditionsAccepted starts false
      // (it may have been changed by detectChanges, but the default is false)
      const freshComponent = TestBed.createComponent(FinishComponent).componentInstance;
      expect(freshComponent.conditionsAccepted).toBe(false);
    });

    it('should have acceptedTerms as an EventEmitter', () => {
      expect(component.acceptedTerms).toBeDefined();
      expect(component.acceptedTerms.emit).toBeDefined();
    });
  });
});
