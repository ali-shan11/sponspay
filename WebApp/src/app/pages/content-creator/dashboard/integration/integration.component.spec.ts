import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { createMockFirebaseAuth } from '../../../../../testing/mocks/firebase-auth.mock';
import { createMockHttpClient } from '../../../../../testing/mocks/http.mock';
import { TokenService } from '@services/token.service';
import { AuthService } from '@services/auth.service';
import { CreatorSignInResponse } from '@app-types/onboarding';

import { IntegrationComponent } from './integration.component';

describe('IntegrationComponent', () => {
  let component: IntegrationComponent;
  let fixture: ComponentFixture<IntegrationComponent>;
  let creatorSignInSubject: BehaviorSubject<CreatorSignInResponse | null>;

  beforeEach(async () => {
    creatorSignInSubject = new BehaviorSubject<CreatorSignInResponse | null>(null);

    const mockAuthService = jasmine.createSpyObj('AuthService', [
      'getCurrentUser',
      'getStoredToken',
      'ensureValidToken',
      'getSignInResponse',
    ], {
      user$: new BehaviorSubject(null),
      accessToken$: new BehaviorSubject(null),
      creatorSignInResponse$: creatorSignInSubject,
    });

    await TestBed.configureTestingModule({
      imports: [IntegrationComponent],
      providers: [
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: HttpClient, useValue: createMockHttpClient() },
        { provide: TokenService, useValue: jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() }) },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], { events: of(), url: '/' }) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}), queryParams: of({}) } },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IntegrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call subSignInResponse on init', () => {
      spyOn(component, 'subSignInResponse');
      component.ngOnInit();
      expect(component.subSignInResponse).toHaveBeenCalled();
    });
  });

  describe('subSignInResponse', () => {
    it('should set signInResponse when auth service emits a value', () => {
      const mockResponse: CreatorSignInResponse = {
        success: true,
        message: 'OK',
        isCreator: true,
        isCoAdmin: true,
        hasAcceptedTerms: true,
      };

      creatorSignInSubject.next(mockResponse);

      expect(component.signInResponse).toEqual(mockResponse);
    });

    it('should set signInResponse to null when auth service emits null', () => {
      const mockResponse: CreatorSignInResponse = {
        success: true,
        message: 'OK',
        isCreator: true,
        isCoAdmin: false,
        hasAcceptedTerms: true,
      };
      creatorSignInSubject.next(mockResponse);
      expect(component.signInResponse).toEqual(mockResponse);

      creatorSignInSubject.next(null);
      expect(component.signInResponse).toBeNull();
    });

    it('should update signInResponse when auth service emits multiple times', () => {
      const firstResponse: CreatorSignInResponse = {
        success: true,
        message: 'First',
        isCreator: false,
        isCoAdmin: false,
        hasAcceptedTerms: false,
      };
      const secondResponse: CreatorSignInResponse = {
        success: true,
        message: 'Second',
        isCreator: true,
        isCoAdmin: true,
        hasAcceptedTerms: true,
      };

      creatorSignInSubject.next(firstResponse);
      expect(component.signInResponse).toEqual(firstResponse);

      creatorSignInSubject.next(secondResponse);
      expect(component.signInResponse).toEqual(secondResponse);
    });
  });

  describe('isTelegramConnected getter', () => {
    it('should return falsy when signInResponse is null', () => {
      component.signInResponse = null;

      expect(component.isTelegramConnected).toBeFalsy();
    });

    it('should return true when isCreator and isCoAdmin are both true', () => {
      component.signInResponse = {
        success: true,
        message: 'OK',
        isCreator: true,
        isCoAdmin: true,
        hasAcceptedTerms: true,
      };

      expect(component.isTelegramConnected).toBeTrue();
    });

    it('should return falsy when isCreator is true but isCoAdmin is false', () => {
      component.signInResponse = {
        success: true,
        message: 'OK',
        isCreator: true,
        isCoAdmin: false,
        hasAcceptedTerms: true,
      };

      expect(component.isTelegramConnected).toBeFalsy();
    });

    it('should return falsy when isCreator is false but isCoAdmin is true', () => {
      component.signInResponse = {
        success: true,
        message: 'OK',
        isCreator: false,
        isCoAdmin: true,
        hasAcceptedTerms: true,
      };

      expect(component.isTelegramConnected).toBeFalsy();
    });

    it('should return falsy when both isCreator and isCoAdmin are false', () => {
      component.signInResponse = {
        success: true,
        message: 'OK',
        isCreator: false,
        isCoAdmin: false,
        hasAcceptedTerms: true,
      };

      expect(component.isTelegramConnected).toBeFalsy();
    });
  });

  describe('initial state', () => {
    it('should have signInResponse as null initially', () => {
      expect(component.signInResponse).toBeNull();
    });

    it('should have isIntegrationDialogOpen set to false initially', () => {
      expect(component.isIntegrationDialogOpen).toBeFalse();
    });

    it('should have messageList populated with 8 items', () => {
      expect(component.messageList).toBeDefined();
      expect(component.messageList.length).toBe(8);
    });

    it('should have messageList items with required properties', () => {
      for (const msg of component.messageList) {
        expect(msg.userName).toBeTruthy();
        expect(msg.message).toBeTruthy();
        expect(msg.date).toBeTruthy();
      }
    });
  });
});
