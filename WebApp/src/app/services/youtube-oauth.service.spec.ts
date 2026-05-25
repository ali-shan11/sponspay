import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { YouTubeOAuthService } from './youtube-oauth.service';
import { TokenService } from './token.service';
import { environment } from '../../environments/environment';

/**
 * Helper: drain microtask queue so that awaited promises inside the service
 * (e.g. await this.tokenService.getToken()) resolve and subsequent HTTP
 * calls are dispatched before we try to intercept them with expectOne().
 */
function flushMicrotasks(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('YouTubeOAuthService', () => {
  let service: YouTubeOAuthService;
  let httpMock: HttpTestingController;
  let tokenServiceSpy: jasmine.SpyObj<TokenService>;
  const BASE_URL = environment.API_BASE;

  beforeEach(() => {
    tokenServiceSpy = jasmine.createSpyObj('TokenService', ['getToken'], {
      authReady: Promise.resolve()
    });
    tokenServiceSpy.getToken.and.returnValue(Promise.resolve('mock-firebase-token'));

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        YouTubeOAuthService,
        { provide: TokenService, useValue: tokenServiceSpy }
      ]
    });
    service = TestBed.inject(YouTubeOAuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ----------------------------------------------------------------
  // Observable / BehaviorSubject initial state
  // ----------------------------------------------------------------
  describe('initial state', () => {
    it('should have status$ default to connected=false, error=null', (done) => {
      service.status$.subscribe(status => {
        expect(status.connected).toBe(false);
        expect(status.error).toBeNull();
        done();
      });
    });

    it('should have channelStatus$ default to "unknown"', (done) => {
      service.channelStatus$.subscribe(status => {
        expect(status).toBe('unknown');
        done();
      });
    });

    it('should have availableChannels$ default to empty array', (done) => {
      service.availableChannels$.subscribe(channels => {
        expect(channels).toEqual([]);
        done();
      });
    });

    it('should have selectedChannel default to null', () => {
      expect(service.selectedChannel).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // getConnectionStatus()
  // ----------------------------------------------------------------
  describe('getConnectionStatus()', () => {
    it('should return the current connection status value', () => {
      const status = service.getConnectionStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // getCurrentChannelStatus()
  // ----------------------------------------------------------------
  describe('getCurrentChannelStatus()', () => {
    it('should return "unknown" initially', () => {
      expect(service.getCurrentChannelStatus()).toBe('unknown');
    });
  });

  // ----------------------------------------------------------------
  // getCurrentAvailableChannels()
  // ----------------------------------------------------------------
  describe('getCurrentAvailableChannels()', () => {
    it('should return empty array initially', () => {
      expect(service.getCurrentAvailableChannels()).toEqual([]);
    });
  });

  // ----------------------------------------------------------------
  // setChannelStatus()
  // ----------------------------------------------------------------
  describe('setChannelStatus()', () => {
    it('should update channel status to "found"', () => {
      service.setChannelStatus('found');
      expect(service.getCurrentChannelStatus()).toBe('found');
    });

    it('should update channel status to "not_found"', () => {
      service.setChannelStatus('not_found');
      expect(service.getCurrentChannelStatus()).toBe('not_found');
    });

    it('should update channel status back to "unknown"', () => {
      service.setChannelStatus('found');
      service.setChannelStatus('unknown');
      expect(service.getCurrentChannelStatus()).toBe('unknown');
    });
  });

  // ----------------------------------------------------------------
  // resetChannelState()
  // ----------------------------------------------------------------
  describe('resetChannelState()', () => {
    it('should reset channelStatus to "unknown"', () => {
      service.setChannelStatus('found');
      service.resetChannelState();
      expect(service.getCurrentChannelStatus()).toBe('unknown');
    });

    it('should reset availableChannels to empty array', () => {
      service.resetChannelState();
      expect(service.getCurrentAvailableChannels()).toEqual([]);
    });

    it('should reset selectedChannel to null', () => {
      service.selectedChannel = { id: 'ch1', title: 'Test', thumbnail: '', role: 'owner' };
      service.resetChannelState();
      expect(service.selectedChannel).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // checkOAuthCallback()
  // ----------------------------------------------------------------
  describe('checkOAuthCallback()', () => {
    it('should return connected=true when youtube_connected="true"', () => {
      const result = service.checkOAuthCallback({ youtube_connected: 'true' });
      expect(result.connected).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should update connectionStatus$ when youtube_connected="true"', () => {
      service.checkOAuthCallback({ youtube_connected: 'true' });
      const status = service.getConnectionStatus();
      expect(status.connected).toBe(true);
    });

    it('should return error status when youtube_error is "denied"', () => {
      const result = service.checkOAuthCallback({ youtube_error: 'denied' });
      expect(result.connected).toBe(false);
      expect(result.error).toBe('denied');
    });

    it('should update connectionStatus$ when youtube_error is "failed"', () => {
      service.checkOAuthCallback({ youtube_error: 'failed' });
      const status = service.getConnectionStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toBe('failed');
    });

    it('should return error status when youtube_error is "no_channel"', () => {
      const result = service.checkOAuthCallback({ youtube_error: 'no_channel' });
      expect(result.connected).toBe(false);
      expect(result.error).toBe('no_channel');
    });

    it('should update connectionStatus$ when youtube_error is "no_channel"', () => {
      service.checkOAuthCallback({ youtube_error: 'no_channel' });
      const status = service.getConnectionStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toBe('no_channel');
    });

    it('should return default status when no OAuth params are present', () => {
      const result = service.checkOAuthCallback({});
      expect(result.connected).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should return default status when params are undefined', () => {
      const result = service.checkOAuthCallback({
        youtube_connected: undefined,
        youtube_error: undefined
      });
      expect(result.connected).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should prioritize youtube_connected over youtube_error when both present', () => {
      const result = service.checkOAuthCallback({
        youtube_connected: 'true',
        youtube_error: 'denied'
      });
      expect(result.connected).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // connectYouTube()
  // ----------------------------------------------------------------
  describe('connectYouTube()', () => {
    it('should throw error when user is not authenticated', async () => {
      tokenServiceSpy.getToken.and.returnValue(Promise.resolve(null));
      await expectAsync(service.connectYouTube()).toBeRejectedWithError(
        'User must be authenticated to connect YouTube'
      );
    });

    it('should request auth URL from backend and open popup', async () => {
      const mockPopup = { closed: false, close: jasmine.createSpy('close') };
      spyOn(window, 'open').and.returnValue(mockPopup as unknown as Window);

      const connectPromise = service.connectYouTube();
      await flushMicrotasks();

      const req = httpMock.expectOne(r =>
        r.url === `${BASE_URL}/creator/youtube/auth-url`
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.has('returnUrl')).toBe(true);
      req.flush({ authUrl: 'https://accounts.google.com/o/oauth2/auth?code=test' });

      await connectPromise;
      expect(window.open).toHaveBeenCalled();

      // Clean up: simulate popup closing so the interval clears
      mockPopup.closed = true;
    });

    it('should throw error when popup is blocked', async () => {
      spyOn(window, 'open').and.returnValue(null);

      const connectPromise = service.connectYouTube();
      await flushMicrotasks();

      const req = httpMock.expectOne(r =>
        r.url === `${BASE_URL}/creator/youtube/auth-url`
      );
      req.flush({ authUrl: 'https://accounts.google.com/o/oauth2/auth' });

      await expectAsync(connectPromise).toBeRejectedWithError(
        'Failed to open popup. Please allow popups for this site.'
      );

      const status = service.getConnectionStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toBe('failed');
    });

    it('should set connected=true on successful OAuth postMessage', async () => {
      const mockPopup = { closed: false, close: jasmine.createSpy('close') };
      spyOn(window, 'open').and.returnValue(mockPopup as unknown as Window);

      const connectPromise = service.connectYouTube();
      await flushMicrotasks();

      const req = httpMock.expectOne(r =>
        r.url === `${BASE_URL}/creator/youtube/auth-url`
      );
      req.flush({ authUrl: 'https://accounts.google.com/o/oauth2/auth' });
      await connectPromise;

      // Simulate the postMessage from the OAuth popup
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'youtube-oauth-result', success: true },
        origin: window.location.origin
      }));

      const status = service.getConnectionStatus();
      expect(status.connected).toBe(true);
      expect(status.error).toBeNull();
      expect(mockPopup.close).toHaveBeenCalled();

      mockPopup.closed = true;
    });

    it('should set error on failed OAuth postMessage with error string', async () => {
      const mockPopup = { closed: false, close: jasmine.createSpy('close') };
      spyOn(window, 'open').and.returnValue(mockPopup as unknown as Window);

      const connectPromise = service.connectYouTube();
      await flushMicrotasks();

      const req = httpMock.expectOne(r =>
        r.url === `${BASE_URL}/creator/youtube/auth-url`
      );
      req.flush({ authUrl: 'https://accounts.google.com/o/oauth2/auth' });
      await connectPromise;

      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'youtube-oauth-result', success: false, error: 'denied' },
        origin: window.location.origin
      }));

      const status = service.getConnectionStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toBe('denied');

      mockPopup.closed = true;
    });

    it('should set default "failed" error when OAuth fails without error string', async () => {
      const mockPopup = { closed: false, close: jasmine.createSpy('close') };
      spyOn(window, 'open').and.returnValue(mockPopup as unknown as Window);

      const connectPromise = service.connectYouTube();
      await flushMicrotasks();

      const req = httpMock.expectOne(r =>
        r.url === `${BASE_URL}/creator/youtube/auth-url`
      );
      req.flush({ authUrl: 'https://accounts.google.com/o/oauth2/auth' });
      await connectPromise;

      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'youtube-oauth-result', success: false },
        origin: window.location.origin
      }));

      const status = service.getConnectionStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toBe('failed');

      mockPopup.closed = true;
    });

    it('should set error on HTTP failure when fetching auth URL', async () => {
      const connectPromise = service.connectYouTube();
      await flushMicrotasks();

      const req = httpMock.expectOne(r =>
        r.url === `${BASE_URL}/creator/youtube/auth-url`
      );
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      await expectAsync(connectPromise).toBeRejected();

      const status = service.getConnectionStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toBe('failed');
    });
  });

  // ----------------------------------------------------------------
  // getChannelDataForEstimator()
  // ----------------------------------------------------------------
  describe('getChannelDataForEstimator()', () => {
    it('should throw error when user is not authenticated', async () => {
      tokenServiceSpy.getToken.and.returnValue(Promise.resolve(null));
      await expectAsync(service.getChannelDataForEstimator()).toBeRejectedWithError(
        'User must be authenticated'
      );
    });

    it('should make a GET request to the channel-data endpoint', async () => {
      const mockResponse = {
        connected: true,
        channels: [{
          id: 'UC123',
          title: 'Test Channel',
          subscriberCount: '1000',
          viewCount: '50000',
          videoCount: '100',
          thumbnailUrl: 'https://example.com/thumb.jpg'
        }]
      };

      const promise = service.getChannelDataForEstimator();
      await flushMicrotasks();

      const req = httpMock.expectOne(r =>
        r.url === `${BASE_URL}/creator/youtube/channel-data`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      const result = await promise;
      expect(result.connected).toBe(true);
      expect(result.channels!.length).toBe(1);
      expect(result.channels![0].id).toBe('UC123');
    });

    it('should return fallback when response is null/falsy', async () => {
      const promise = service.getChannelDataForEstimator();
      await flushMicrotasks();

      const req = httpMock.expectOne(r =>
        r.url === `${BASE_URL}/creator/youtube/channel-data`
      );
      req.flush(null);

      const result = await promise;
      expect(result.connected).toBe(false);
      expect(result.error).toBe('Request failed');
    });
  });

  // ----------------------------------------------------------------
  // syncChannelData()
  // ----------------------------------------------------------------
  describe('syncChannelData()', () => {
    it('should throw error when user is not authenticated', async () => {
      tokenServiceSpy.getToken.and.returnValue(Promise.resolve(null));
      await expectAsync(service.syncChannelData()).toBeRejectedWithError(
        'User must be authenticated'
      );
    });

    it('should make a POST request to the sync endpoint', async () => {
      const mockResponse = {
        success: true,
        channelId: 'UC123',
        channelName: 'Test Channel'
      };

      const promise = service.syncChannelData();
      await flushMicrotasks();

      const req = httpMock.expectOne(r =>
        r.url === `${BASE_URL}/creator/youtube/sync`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockResponse);

      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.channelId).toBe('UC123');
      expect(result.channelName).toBe('Test Channel');
    });

    it('should return requiresAuth when token does not exist on server', async () => {
      const mockResponse = {
        success: false,
        requiresAuth: true,
        error: 'No YouTube token found'
      };

      const promise = service.syncChannelData();
      await flushMicrotasks();

      const req = httpMock.expectOne(r =>
        r.url === `${BASE_URL}/creator/youtube/sync`
      );
      req.flush(mockResponse);

      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.requiresAuth).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // getAnalyticsReport()
  // ----------------------------------------------------------------
  describe('getAnalyticsReport()', () => {
    it('should throw error when user is not authenticated', async () => {
      tokenServiceSpy.getToken.and.returnValue(Promise.resolve(null));
      await expectAsync(service.getAnalyticsReport('UC123')).toBeRejectedWithError(
        'User must be authenticated'
      );
    });

    it('should make a GET request with default durationMonths=12', async () => {
      const mockReport = {
        kind: 'youtubeAnalytics#resultTable',
        columnHeaders: [],
        rows: []
      };

      const promise = service.getAnalyticsReport('UC123');
      await flushMicrotasks();

      const req = httpMock.expectOne(r =>
        r.url === `${BASE_URL}/creator/youtube/analytics-report`
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('channelId')).toBe('UC123');
      expect(req.request.params.get('durationMonths')).toBe('12');
      req.flush(mockReport);

      const result = await promise;
      expect(result).toEqual(mockReport);
    });

    it('should allow custom durationMonths', async () => {
      const promise = service.getAnalyticsReport('UC456', 6);
      await flushMicrotasks();

      const req = httpMock.expectOne(r =>
        r.url === `${BASE_URL}/creator/youtube/analytics-report`
      );
      expect(req.request.params.get('channelId')).toBe('UC456');
      expect(req.request.params.get('durationMonths')).toBe('6');
      req.flush({ kind: 'youtubeAnalytics#resultTable', columnHeaders: [], rows: [] });

      await promise;
    });
  });

  // ----------------------------------------------------------------
  // fetchAndSetChannelData()
  // ----------------------------------------------------------------
  describe('fetchAndSetChannelData()', () => {
    it('should set channels and status "found" when channels exist', async () => {
      const mockResponse = {
        connected: true,
        channels: [{
          id: 'UC123',
          title: 'My Channel',
          subscriberCount: '5000',
          viewCount: '100000',
          videoCount: '200',
          thumbnailUrl: 'https://example.com/thumb.jpg'
        }]
      };

      const promise = service.fetchAndSetChannelData();
      await flushMicrotasks();

      const req = httpMock.expectOne(r =>
        r.url === `${BASE_URL}/creator/youtube/channel-data`
      );
      req.flush(mockResponse);

      await promise;

      expect(service.getCurrentChannelStatus()).toBe('found');
      const channels = service.getCurrentAvailableChannels();
      expect(channels.length).toBe(1);
      expect(channels[0].id).toBe('UC123');
      expect(channels[0].title).toBe('My Channel');
      expect(channels[0].thumbnail).toBe('https://example.com/thumb.jpg');
      expect(channels[0].role).toBe('owner');
      expect(channels[0].subscriberCount).toBe(5000);
    });

    it('should set status "not_found" when not connected', async () => {
      const promise = service.fetchAndSetChannelData();
      await flushMicrotasks();

      const req = httpMock.expectOne(r =>
        r.url === `${BASE_URL}/creator/youtube/channel-data`
      );
      req.flush({ connected: false });

      await promise;
      expect(service.getCurrentChannelStatus()).toBe('not_found');
    });

    it('should set status "not_found" when channels array is empty', async () => {
      const promise = service.fetchAndSetChannelData();
      await flushMicrotasks();

      const req = httpMock.expectOne(r =>
        r.url === `${BASE_URL}/creator/youtube/channel-data`
      );
      req.flush({ connected: true, channels: [] });

      await promise;
      expect(service.getCurrentChannelStatus()).toBe('not_found');
    });

    it('should set status "not_found" when channels is undefined', async () => {
      const promise = service.fetchAndSetChannelData();
      await flushMicrotasks();

      const req = httpMock.expectOne(r =>
        r.url === `${BASE_URL}/creator/youtube/channel-data`
      );
      req.flush({ connected: true });

      await promise;
      expect(service.getCurrentChannelStatus()).toBe('not_found');
    });

    it('should set status "not_found" on HTTP error', async () => {
      const promise = service.fetchAndSetChannelData();
      await flushMicrotasks();

      const req = httpMock.expectOne(r =>
        r.url === `${BASE_URL}/creator/youtube/channel-data`
      );
      req.flush('Error', { status: 500, statusText: 'Internal Server Error' });

      await promise;
      expect(service.getCurrentChannelStatus()).toBe('not_found');
    });

    it('should handle multiple channels', async () => {
      const mockResponse = {
        connected: true,
        channels: [
          {
            id: 'UC111', title: 'Channel A', subscriberCount: '1000',
            viewCount: '10000', videoCount: '50', thumbnailUrl: 'https://example.com/a.jpg'
          },
          {
            id: 'UC222', title: 'Channel B', subscriberCount: '2000',
            viewCount: '20000', videoCount: '100', thumbnailUrl: 'https://example.com/b.jpg'
          }
        ]
      };

      const promise = service.fetchAndSetChannelData();
      await flushMicrotasks();

      const req = httpMock.expectOne(r =>
        r.url === `${BASE_URL}/creator/youtube/channel-data`
      );
      req.flush(mockResponse);

      await promise;

      const channels = service.getCurrentAvailableChannels();
      expect(channels.length).toBe(2);
      expect(channels[0].subscriberCount).toBe(1000);
      expect(channels[1].subscriberCount).toBe(2000);
    });
  });

  // ----------------------------------------------------------------
  // getChannelMembersReportForChannel()
  // ----------------------------------------------------------------
  describe('getChannelMembersReportForChannel()', () => {
    it('should return analytics report for a channel', async () => {
      const mockReport = {
        kind: 'youtubeAnalytics#resultTable' as const,
        columnHeaders: [
          { name: 'country', columnType: 'DIMENSION' as const, dataType: 'STRING' as const }
        ],
        rows: [['US', 100]]
      };

      const promise = service.getChannelMembersReportForChannel('UC123');
      await flushMicrotasks();

      const req = httpMock.expectOne(r =>
        r.url === `${BASE_URL}/creator/youtube/analytics-report`
      );
      expect(req.request.params.get('channelId')).toBe('UC123');
      expect(req.request.params.get('durationMonths')).toBe('12');
      req.flush(mockReport);

      const result = await promise;
      expect(result).toBeDefined();
      expect(result!.kind).toBe('youtubeAnalytics#resultTable');
    });

    it('should rethrow and log nested Google API errors', async () => {
      const promise = service.getChannelMembersReportForChannel('UC123');
      await flushMicrotasks();

      const req = httpMock.expectOne(r =>
        r.url === `${BASE_URL}/creator/youtube/analytics-report`
      );
      // HttpTestingController wraps the body in an HttpErrorResponse.
      // The catch block receives the HttpErrorResponse which has shape
      // { error: <flushed body>, status, statusText, url }
      // So to trigger typedError.error.error, we flush a body that has
      // { error: { code, message, errors } } which makes
      // HttpErrorResponse.error = { error: { code, message, errors } }
      req.flush(
        { error: { code: 403, message: 'Forbidden', errors: [{ message: 'Insufficient', domain: 'youtube', reason: 'forbidden' }] } },
        { status: 403, statusText: 'Forbidden' }
      );

      await expectAsync(promise).toBeRejected();
    });

    it('should rethrow and log root-level API error when no nested error.error', async () => {
      const promise = service.getChannelMembersReportForChannel('UC123');
      await flushMicrotasks();

      const req = httpMock.expectOne(r =>
        r.url === `${BASE_URL}/creator/youtube/analytics-report`
      );
      // Flush body as a string so that HttpErrorResponse.error is a string
      // typedError.error => HttpErrorResponse (which has .error property but no .error.error)
      req.flush('Something went wrong', { status: 500, statusText: 'Internal Server Error' });

      await expectAsync(promise).toBeRejected();
    });

    it('should handle error with error.error but no error.error.message or errors', async () => {
      const promise = service.getChannelMembersReportForChannel('UC123');
      await flushMicrotasks();

      const req = httpMock.expectOne(r =>
        r.url === `${BASE_URL}/creator/youtube/analytics-report`
      );
      req.flush(
        { error: { code: 400 } },
        { status: 400, statusText: 'Bad Request' }
      );

      await expectAsync(promise).toBeRejected();
    });
  });
});
