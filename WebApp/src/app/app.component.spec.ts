import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Auth } from '@angular/fire/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, of } from 'rxjs';
import { AppComponent } from './app.component';
import { createMockFirebaseAuth, createMockHttpClient, createMockAuthUser } from '../testing';
import { ZohoSalesIQService } from '@services/zoho-salesiq.service';
import { ZohoPageSenseService } from '@services/zoho-pagesense.service';
import { TokenService } from '@services/token.service';
import { YouTubeOAuthService } from '@services/youtube-oauth.service';
import { AlertService } from '@services/alert.service';

describe('AppComponent', () => {
  let mockZohoSalesIQService: jasmine.SpyObj<ZohoSalesIQService>;
  let mockZohoPageSenseService: jasmine.SpyObj<ZohoPageSenseService>;
  let mockYouTubeOAuthService: jasmine.SpyObj<YouTubeOAuthService>;
  let mockAlertService: jasmine.SpyObj<AlertService>;
  let mockFirebaseAuth: ReturnType<typeof createMockFirebaseAuth>;
  let mockHttpClient: ReturnType<typeof createMockHttpClient>;
  let queryParamsSubject: Subject<Record<string, string>>;

  beforeEach(async () => {
    mockZohoSalesIQService = jasmine.createSpyObj('ZohoSalesIQService', ['initializeTracking']);
    mockZohoSalesIQService.initializeTracking.and.returnValue(Promise.resolve());

    mockZohoPageSenseService = jasmine.createSpyObj('ZohoPageSenseService', ['initializeTracking', 'identifyUser', 'resetIdentity']);
    mockZohoPageSenseService.initializeTracking.and.returnValue(Promise.resolve());

    mockYouTubeOAuthService = jasmine.createSpyObj('YouTubeOAuthService', ['checkOAuthCallback']);
    mockAlertService = jasmine.createSpyObj('AlertService', ['success', 'error', 'info']);

    mockFirebaseAuth = createMockFirebaseAuth();
    mockHttpClient = createMockHttpClient();

    queryParamsSubject = new Subject<Record<string, string>>();

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: ZohoSalesIQService, useValue: mockZohoSalesIQService },
        { provide: ZohoPageSenseService, useValue: mockZohoPageSenseService },
        { provide: Auth, useValue: mockFirebaseAuth },
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: TokenService, useValue: jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() }) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], { events: of(), url: '/' }) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}), queryParams: queryParamsSubject.asObservable() } },
        { provide: YouTubeOAuthService, useValue: mockYouTubeOAuthService },
        { provide: AlertService, useValue: mockAlertService }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should initialize Zoho SalesIQ tracking on init', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    await app.ngOnInit();

    expect(mockZohoSalesIQService.initializeTracking).toHaveBeenCalled();
  });

  it('should handle Zoho SalesIQ initialization failure gracefully', async () => {
    mockZohoSalesIQService.initializeTracking.and.returnValue(Promise.reject('Zoho disabled'));
    spyOn(console, 'warn');

    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    await app.ngOnInit();

    // Wait for the promise rejection to be handled
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(console.warn).toHaveBeenCalled();
  });

  it('should initialize Zoho PageSense tracking on init', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    await app.ngOnInit();

    expect(mockZohoPageSenseService.initializeTracking).toHaveBeenCalled();
  });

  it('should handle Zoho PageSense initialization failure gracefully', async () => {
    mockZohoPageSenseService.initializeTracking.and.returnValue(Promise.reject('PageSense disabled'));
    spyOn(console, 'warn');

    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    await app.ngOnInit();

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(console.warn).toHaveBeenCalled();
  });

  it('should identify user with PageSense when user is logged in', async () => {
    const mockUser = createMockAuthUser({ email: 'test@example.com', displayName: 'Test User', uid: 'uid123' });
    mockFirebaseAuth.setMockUser(mockUser);

    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    await app.ngOnInit();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockZohoPageSenseService.identifyUser).toHaveBeenCalledWith('test@example.com', {
      displayName: 'Test User',
      uid: 'uid123'
    });
  });

  it('should handle Zoho SalesIQ initialization success', async () => {
    spyOn(console, 'log');

    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    await app.ngOnInit();

    // Wait for the promise resolution to be handled
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(console.log).toHaveBeenCalledWith('App: Zoho SalesIQ tracking ready');
  });

  // ---- YouTube OAuth callback handling ----

  it('should show success alert when youtube_connected is present and connected', async () => {
    mockYouTubeOAuthService.checkOAuthCallback.and.returnValue({ connected: true, error: null });

    const fixture = TestBed.createComponent(AppComponent);
    await fixture.componentInstance.ngOnInit();

    queryParamsSubject.next({ youtube_connected: 'true' });

    expect(mockYouTubeOAuthService.checkOAuthCallback).toHaveBeenCalledWith({ youtube_connected: 'true' });
    expect(mockAlertService.success).toHaveBeenCalledWith(
      'YouTube Connected',
      jasmine.stringContaining('YouTube channel is now connected')
    );
  });

  it('should show info alert when youtube_error is "denied"', async () => {
    mockYouTubeOAuthService.checkOAuthCallback.and.returnValue({ connected: false, error: 'denied' });

    const fixture = TestBed.createComponent(AppComponent);
    await fixture.componentInstance.ngOnInit();

    queryParamsSubject.next({ youtube_error: 'denied' });

    expect(mockYouTubeOAuthService.checkOAuthCallback).toHaveBeenCalledWith({ youtube_error: 'denied' });
    expect(mockAlertService.info).toHaveBeenCalledWith(
      'Connection Cancelled',
      jasmine.stringContaining('declined the YouTube connection')
    );
  });

  it('should show error alert when youtube_error is "no_channel"', async () => {
    mockYouTubeOAuthService.checkOAuthCallback.and.returnValue({ connected: false, error: 'no_channel' });

    const fixture = TestBed.createComponent(AppComponent);
    await fixture.componentInstance.ngOnInit();

    queryParamsSubject.next({ youtube_error: 'no_channel' });

    expect(mockYouTubeOAuthService.checkOAuthCallback).toHaveBeenCalledWith({ youtube_error: 'no_channel' });
    expect(mockAlertService.error).toHaveBeenCalledWith(
      'No YouTube Channel',
      jasmine.stringContaining('doesn\'t have a YouTube channel')
    );
  });

  it('should show error alert when youtube_error is "failed"', async () => {
    mockYouTubeOAuthService.checkOAuthCallback.and.returnValue({ connected: false, error: 'failed' });

    const fixture = TestBed.createComponent(AppComponent);
    await fixture.componentInstance.ngOnInit();

    queryParamsSubject.next({ youtube_error: 'failed' });

    expect(mockYouTubeOAuthService.checkOAuthCallback).toHaveBeenCalledWith({ youtube_error: 'failed' });
    expect(mockAlertService.error).toHaveBeenCalledWith(
      'Connection Failed',
      jasmine.stringContaining('Failed to connect')
    );
  });

  it('should not show any alert when query params have no youtube params', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.componentInstance.ngOnInit();

    queryParamsSubject.next({ some_other_param: 'value' });

    expect(mockYouTubeOAuthService.checkOAuthCallback).not.toHaveBeenCalled();
    expect(mockAlertService.success).not.toHaveBeenCalled();
    expect(mockAlertService.error).not.toHaveBeenCalled();
    expect(mockAlertService.info).not.toHaveBeenCalled();
  });

  it('should not show any alert when query params are empty', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.componentInstance.ngOnInit();

    queryParamsSubject.next({});

    expect(mockYouTubeOAuthService.checkOAuthCallback).not.toHaveBeenCalled();
  });

  it('should not show any alert when checkOAuthCallback returns connected: false with no error', async () => {
    mockYouTubeOAuthService.checkOAuthCallback.and.returnValue({ connected: false, error: null });

    const fixture = TestBed.createComponent(AppComponent);
    await fixture.componentInstance.ngOnInit();

    queryParamsSubject.next({ youtube_connected: 'false' });

    expect(mockYouTubeOAuthService.checkOAuthCallback).toHaveBeenCalled();
    expect(mockAlertService.success).not.toHaveBeenCalled();
    expect(mockAlertService.error).not.toHaveBeenCalled();
    expect(mockAlertService.info).not.toHaveBeenCalled();
  });
});
