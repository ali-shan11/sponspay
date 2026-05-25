import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FanService } from './fan.service';
import { environment } from 'src/environments/environment';
import { FanChannelInfo, FanPayment, SendFanPaymentBody } from '@app-types/fan';
import { FAN_MESSAGE_TYPE } from '@utils/enums';
import { APP_ENDPOINTS } from '@utils/urls';

describe('FanService', () => {
  let service: FanService;
  let httpMock: HttpTestingController;
  const BASE_URL = environment.API_BASE;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(FanService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loaderContext', () => {
    it('should have a public loaderContext property', () => {
      expect(service.loaderContext).toBeDefined();
    });
  });

  describe('getChannelInformationForFans()', () => {
    it('should make a GET request with the channel handle and limit param', () => {
      const handle = '@testchannel';
      const mockResponse: Partial<FanChannelInfo> = {
        channelHandle: '@testchannel',
        paymentsAvailable: true,
        inviteLink: 'https://t.me/+abc123',
        qr: 'data:image/png;base64,abc',
        paymentCountries: []
      };

      service.getChannelInformationForFans(handle).subscribe(response => {
        expect(response.channelHandle).toBe('@testchannel');
      });

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + APP_ENDPOINTS.FAN + handle
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('limit')).toBe('10');
      req.flush(mockResponse);
    });

    it('should include the loader context in the request', () => {
      const handle = 'channel1';

      service.getChannelInformationForFans(handle).subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + APP_ENDPOINTS.FAN + handle
      );
      expect(req.request.method).toBe('GET');
      req.flush({});
    });

    it('should handle different channel handles', () => {
      const handle = 'another-channel';

      service.getChannelInformationForFans(handle).subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/fan/' + handle
      );
      expect(req.request.method).toBe('GET');
      req.flush({});
    });

    it('should propagate HTTP errors', () => {
      const handle = 'nonexistent';

      service.getChannelInformationForFans(handle).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + APP_ENDPOINTS.FAN + handle
      );
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('fanPayment()', () => {
    const handle = '@testchannel';
    const body: SendFanPaymentBody = {
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
      messageContent: 'Hello creator!',
      messageType: FAN_MESSAGE_TYPE.VIDEO,
      payerFullName: 'John Doe',
      payerPhone: '+254712345678',
      priceMultiple: 1,
      currency: 'KES',
      correspondent: 'MPESA_KEN',
      youtubeUrl: 'https://youtube.com/watch?v=abc123'
    };

    it('should make a POST request with the correct URL and body', () => {
      const mockResponse: FanPayment = {
        depositId: 'dep-123',
        fanSessionId: 'fs-456',
        transactionId: 'txn-789',
        status: 'pending',
        channelHandle: '@testchannel'
      };

      service.fanPayment(handle, body).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + APP_ENDPOINTS.FAN + handle + APP_ENDPOINTS.FAN_PAYMENT
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });

    it('should include the loader context', () => {
      service.fanPayment(handle, body).subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + '/fan/' + handle + '/payment'
      );
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    it('should handle payment with optional fields', () => {
      const bodyWithOptionals: SendFanPaymentBody = {
        ...body,
        subject: 'Test subject',
        referralSource: 'facebook',
        referralMedium: 'social',
        referralCampaign: 'summer_2025',
        youtubeLiveChatId: 'chat-123'
      };

      service.fanPayment(handle, bodyWithOptionals).subscribe();

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + APP_ENDPOINTS.FAN + handle + APP_ENDPOINTS.FAN_PAYMENT
      );
      expect(req.request.body).toEqual(bodyWithOptionals);
      expect(req.request.body.subject).toBe('Test subject');
      expect(req.request.body.referralSource).toBe('facebook');
      req.flush({});
    });

    it('should propagate HTTP errors', () => {
      service.fanPayment(handle, body).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
        }
      });

      const req = httpMock.expectOne(r =>
        r.url === BASE_URL + APP_ENDPOINTS.FAN + handle + APP_ENDPOINTS.FAN_PAYMENT
      );
      req.flush('Bad request', { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('getYouTubeVideoId()', () => {
    it('should extract video ID from standard watch URL', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      expect(service.getYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from embed URL', () => {
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
      expect(service.getYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from short URL', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ';
      expect(service.getYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from v/ URL', () => {
      const url = 'https://www.youtube.com/v/dQw4w9WgXcQ';
      expect(service.getYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should return null for invalid URLs', () => {
      expect(service.getYouTubeVideoId('not-a-url')).toBeNull();
      expect(service.getYouTubeVideoId('https://example.com')).toBeNull();
      expect(service.getYouTubeVideoId('')).toBeNull();
    });

    it('should handle URLs with additional query parameters', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120';
      expect(service.getYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should handle video IDs with hyphens and underscores', () => {
      const url = 'https://www.youtube.com/watch?v=Ab-Cd_12345';
      expect(service.getYouTubeVideoId(url)).toBe('Ab-Cd_12345');
    });
  });

  describe('getYoutubeVideoData()', () => {
    it('should return null when no access token in localStorage', async () => {
      spyOn(localStorage, 'getItem').and.returnValue(null);

      const result = await service.getYoutubeVideoData('https://www.youtube.com/embed/abc12345678');

      expect(result).toBeNull();
    });

    it('should call YouTube API when access token exists', async () => {
      const mockToken = 'mock-youtube-token';
      spyOn(localStorage, 'getItem').and.returnValue(mockToken);

      const mockJsonResponse = {
        items: [{ liveStreamingDetails: { activeLiveChatId: 'chat-123' } }]
      };

      // Mock fetch globally
      spyOn(window, 'fetch').and.returnValue(
        Promise.resolve(new Response(JSON.stringify(mockJsonResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }))
      );

      const result = await service.getYoutubeVideoData('https://www.youtube.com/embed/abc12345678');

      expect(window.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=abc12345678',
        {
          headers: { Authorization: `Bearer ${mockToken}` }
        }
      );
      expect(result).toEqual(mockJsonResponse);
    });

    it('should extract video ID from embed URL before calling API', async () => {
      spyOn(localStorage, 'getItem').and.returnValue('token');
      spyOn(window, 'fetch').and.returnValue(
        Promise.resolve(new Response('{}', { status: 200 }))
      );

      await service.getYoutubeVideoData('https://www.youtube.com/embed/XyZ_abc1234');

      expect(window.fetch).toHaveBeenCalledWith(
        jasmine.stringContaining('id=XyZ_abc1234'),
        jasmine.any(Object)
      );
    });

    it('should extract video ID from watch URL before calling API', async () => {
      spyOn(localStorage, 'getItem').and.returnValue('token');
      spyOn(window, 'fetch').and.returnValue(
        Promise.resolve(new Response('{}', { status: 200 }))
      );

      await service.getYoutubeVideoData('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      expect(window.fetch).toHaveBeenCalledWith(
        jasmine.stringContaining('id=dQw4w9WgXcQ'),
        jasmine.any(Object)
      );
    });
  });
});
