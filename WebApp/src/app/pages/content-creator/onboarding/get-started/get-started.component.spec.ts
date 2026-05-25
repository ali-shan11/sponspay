import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { createMockFirebaseAuth } from '../../../../../testing/mocks/firebase-auth.mock';
import { createMockHttpClient } from '../../../../../testing/mocks/http.mock';
import { TokenService } from '@services/token.service';
import { AuthService } from '@services/auth.service';

import { GetStartedComponent } from './get-started.component';

describe('GetStartedComponent', () => {
  let component: GetStartedComponent;
  let fixture: ComponentFixture<GetStartedComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['onLoginClick', 'signOut'], {
      user$: new BehaviorSubject(null),
      creatorSignInResponse$: new BehaviorSubject(null),
      accessToken$: new BehaviorSubject(null),
    });
    mockAuthService.onLoginClick.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [GetStartedComponent],
      providers: [
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: HttpClient, useValue: createMockHttpClient() },
        { provide: TokenService, useValue: jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() }) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], { events: of(), url: '/' }) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}), queryParams: of({}) } },
        { provide: AuthService, useValue: mockAuthService },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GetStartedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a goToNextStep EventEmitter', () => {
    expect(component.goToNextStep).toBeDefined();
    expect(component.goToNextStep.subscribe).toBeDefined();
  });

  describe('onButtonClick', () => {
    it('should emit true on goToNextStep', () => {
      spyOn(component.goToNextStep, 'emit');
      component.onButtonClick();
      expect(component.goToNextStep.emit).toHaveBeenCalledWith(true);
    });
  });

  describe('onLoginClick', () => {
    it('should call authService.onLoginClick with onboarding context', async () => {
      await component.onLoginClick();
      expect(mockAuthService.onLoginClick).toHaveBeenCalledWith('onboarding');
    });
  });
});
