import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { createMockFirebaseAuth } from '../../../testing/mocks/firebase-auth.mock';
import { AuthService } from '@services/auth.service';
import { MarketingService } from '@services/marketing.service';
import { LoadingStateService } from '@services/loading-state.service';
import { SessionStorageService } from '@services/session-storage.service';
import { LandingPageDetailResponse, MarketingNewsResponse } from '@app-types/marketing';

import { LandingPageComponent } from './landing-page.component';

describe('LandingPageComponent', () => {
  let component: LandingPageComponent;
  let fixture: ComponentFixture<LandingPageComponent>;
  let mockMarketingService: jasmine.SpyObj<MarketingService>;

  const mockLandingDetails: LandingPageDetailResponse = {
    totalRevenue: 10000,
    growth: 15.5,
    countriesSupported: 6,
    transactions: 500,
    users: [{ avatar: 'https://example.com/avatar.jpg' }],
  };

  const mockNews: MarketingNewsResponse[] = [{
    id: 'news-1',
    title: 'Test News',
    subtitle: 'Subtitle',
    content: 'Content',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-02',
    deletedAt: '',
  }];

  beforeEach(async () => {
    mockMarketingService = jasmine.createSpyObj('MarketingService', ['getLandingPageDetails', 'getLatestNews']);
    mockMarketingService.getLandingPageDetails.and.returnValue(of(mockLandingDetails));
    mockMarketingService.getLatestNews.and.returnValue(of(mockNews));

    const mockAuthService = jasmine.createSpyObj('AuthService', [
      'getCurrentUser', 'getStoredToken', 'ensureValidToken', 'initiateSignIn', 'onLoginClick'
    ], {
      user$: new BehaviorSubject(null),
      accessToken$: new BehaviorSubject(null),
      creatorSignInResponse$: new BehaviorSubject(null),
    });

    const mockLoadingStateService = jasmine.createSpyObj('LoadingStateService', [
      'setLoading', 'setError', 'clear', 'getCurrentError'
    ], {
      loading$: new BehaviorSubject(false),
      error$: new BehaviorSubject(null),
    });

    const mockSessionStorageService = jasmine.createSpyObj('SessionStorageService', [
      'getItem', 'setItem', 'removeItem', 'getBooleanItem', 'setBooleanItem'
    ]);

    await TestBed.configureTestingModule({
      imports: [LandingPageComponent, HttpClientTestingModule],
      providers: [
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MarketingService, useValue: mockMarketingService },
        { provide: LoadingStateService, useValue: mockLoadingStateService },
        { provide: SessionStorageService, useValue: mockSessionStorageService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}), queryParams: of({}) } },
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(LandingPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with email and age controls', () => {
    expect(component.form).toBeDefined();
    expect(component.emailControl).toBeDefined();
    expect(component.ageControl).toBeDefined();
  });

  it('should have email required and email validators', () => {
    component.emailControl.setValue('');
    expect(component.emailControl.invalid).toBe(true);

    component.emailControl.setValue('invalid-email');
    expect(component.emailControl.invalid).toBe(true);

    component.emailControl.setValue('valid@email.com');
    expect(component.emailControl.valid).toBe(true);
  });

  it('should have age required validator', () => {
    expect(component.ageControl.invalid).toBe(true);

    component.ageControl.setValue(25);
    expect(component.ageControl.valid).toBe(true);
  });

  describe('ngOnInit', () => {
    it('should call getLandingPageDetails', () => {
      expect(mockMarketingService.getLandingPageDetails).toHaveBeenCalled();
    });

    it('should set landingDetails from API response', () => {
      expect(component.landingDetails).toEqual(mockLandingDetails);
    });
  });

  describe('getLandingPageDetails', () => {
    it('should update landingDetails on success', () => {
      const newDetails: LandingPageDetailResponse = { ...mockLandingDetails, totalRevenue: 20000 };
      mockMarketingService.getLandingPageDetails.and.returnValue(of(newDetails));
      component.getLandingPageDetails();
      expect(component.landingDetails).toEqual(newDetails);
    });
  });

  describe('getLatestNews', () => {
    it('should update latestNews on success', () => {
      component.getLatestNews();
      expect(component.latestNews).toEqual(mockNews);
      expect(mockMarketingService.getLatestNews).toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('should unsubscribe from all subscriptions', () => {
      // Trigger some subscriptions
      component.getLandingPageDetails();
      component.getLatestNews();
      expect(component.unsubscribe.length).toBeGreaterThan(0);

      const unsubSpies = component.unsubscribe.map(sub => spyOn(sub, 'unsubscribe'));
      component.ngOnDestroy();
      unsubSpies.forEach(spy => {
        expect(spy).toHaveBeenCalled();
      });
    });
  });
});
