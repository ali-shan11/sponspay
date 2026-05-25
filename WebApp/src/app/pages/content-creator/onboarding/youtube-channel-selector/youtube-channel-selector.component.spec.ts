import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { createMockFirebaseAuth } from '../../../../../testing/mocks/firebase-auth.mock';
import { TokenService } from '@services/token.service';
import { YouTubeOAuthService } from '@services/youtube-oauth.service';
import { AlertService } from '@services/alert.service';

import { YoutubeChannelSelectorComponent } from './youtube-channel-selector.component';

describe('YoutubeChannelSelectorComponent', () => {
  let component: YoutubeChannelSelectorComponent;
  let fixture: ComponentFixture<YoutubeChannelSelectorComponent>;
  let mockYoutubeOAuthService: any;
  let mockAlertService: jasmine.SpyObj<AlertService>;
  let statusSubject: BehaviorSubject<any>;

  beforeEach(async () => {
    statusSubject = new BehaviorSubject({ connected: false, error: null });

    mockYoutubeOAuthService = {
      getConnectionStatus: jasmine.createSpy('getConnectionStatus').and.returnValue({ connected: false, error: null }),
      setConnectionStatus: jasmine.createSpy('setConnectionStatus').and.callFake((status: any) => statusSubject.next(status)),
      status$: statusSubject.asObservable(),
      fetchAndSetChannelData: jasmine.createSpy('fetchAndSetChannelData'),
      syncChannelData: jasmine.createSpy('syncChannelData').and.returnValue(Promise.resolve({ success: false, requiresAuth: true })),
      connectYouTube: jasmine.createSpy('connectYouTube').and.returnValue(Promise.resolve()),
    };

    mockAlertService = jasmine.createSpyObj('AlertService', ['success', 'error', 'info']);

    await TestBed.configureTestingModule({
      imports: [YoutubeChannelSelectorComponent, HttpClientTestingModule],
      providers: [
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: TokenService, useValue: jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() }) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], { events: of(), url: '/' }) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}), queryParams: of({}) } },
        { provide: YouTubeOAuthService, useValue: mockYoutubeOAuthService },
        { provide: AlertService, useValue: mockAlertService },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(YoutubeChannelSelectorComponent);
    component = fixture.componentInstance;
  });

  it('should create', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.isConnectingYouTube).toBe(false);
    expect(component.youtubeConnectionStatus).toEqual({ connected: false, error: null });
  });

  describe('ngOnInit', () => {
    it('should set connection status from backend on init', async () => {
      mockYoutubeOAuthService.getConnectionStatus.and.returnValue({ connected: true, error: null });
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.youtubeConnectionStatus).toEqual({ connected: true, error: null });
    });

    it('should call syncChannelData when backend says not connected', async () => {
      mockYoutubeOAuthService.getConnectionStatus.and.returnValue({ connected: false, error: null });
      fixture.detectChanges();
      await fixture.whenStable();
      expect(mockYoutubeOAuthService.syncChannelData).toHaveBeenCalled();
    });

    it('should NOT call syncChannelData when backend says connected', async () => {
      mockYoutubeOAuthService.getConnectionStatus.and.returnValue({ connected: true, error: null });
      fixture.detectChanges();
      await fixture.whenStable();
      expect(mockYoutubeOAuthService.syncChannelData).not.toHaveBeenCalled();
    });

    it('should update status and show success alert when status$ emits connected', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      statusSubject.next({ connected: true, error: null });

      expect(component.youtubeConnectionStatus).toEqual({ connected: true, error: null });
      expect(component.isConnectingYouTube).toBe(false);
      expect(mockYoutubeOAuthService.fetchAndSetChannelData).toHaveBeenCalled();
      expect(mockAlertService.success).toHaveBeenCalledWith(
        'Success',
        'YouTube channel connected successfully! You can now proceed to the next step.'
      );
    });

    it('should update status when status$ emits not connected', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      statusSubject.next({ connected: false, error: 'denied' });

      expect(component.youtubeConnectionStatus).toEqual({ connected: false, error: 'denied' });
      expect(component.isConnectingYouTube).toBe(false);
    });

    it('should handle successful auto-sync', async () => {
      mockYoutubeOAuthService.syncChannelData.and.returnValue(Promise.resolve({ success: true, channelName: 'TestChannel' }));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.youtubeConnectionStatus).toEqual({ connected: true, error: null });
      expect(mockYoutubeOAuthService.fetchAndSetChannelData).toHaveBeenCalled();
    });

    it('should handle auto-sync error gracefully', async () => {
      mockYoutubeOAuthService.syncChannelData.and.returnValue(Promise.reject(new Error('Sync failed')));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component).toBeTruthy();
    });

    it('should handle auto-sync returning requiresAuth', async () => {
      mockYoutubeOAuthService.syncChannelData.and.returnValue(Promise.resolve({ success: false, requiresAuth: true }));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.youtubeConnectionStatus).toEqual({ connected: false, error: null });
    });

    it('should handle auto-sync returning other error', async () => {
      mockYoutubeOAuthService.syncChannelData.and.returnValue(Promise.resolve({ success: false, requiresAuth: false, error: 'Token expired' }));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component).toBeTruthy();
    });
  });

  describe('ngOnDestroy', () => {
    it('should clean up subscriptions', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('connectYouTube', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should set isConnectingYouTube to true and call connectYouTube', async () => {
      await component.connectYouTube();
      expect(component.isConnectingYouTube).toBe(true);
      expect(mockYoutubeOAuthService.connectYouTube).toHaveBeenCalled();
    });

    it('should handle error by resetting isConnectingYouTube and showing alert', async () => {
      mockYoutubeOAuthService.connectYouTube.and.returnValue(Promise.reject(new Error('OAuth failed')));
      await component.connectYouTube();
      expect(component.isConnectingYouTube).toBe(false);
      expect(mockAlertService.error).toHaveBeenCalledWith('Connection Error', 'Failed to start YouTube connection. Please try again.');
    });
  });
});
