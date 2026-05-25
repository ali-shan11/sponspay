import { Test, TestingModule } from '@nestjs/testing';
import { YouTubeOAuthService } from './youtube-oauth.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { YouTubeTokenService } from '../youtube-message/services/youtube-token.service';
import { YouTubeChannel } from '../creator/entities/youtube-channel.entity';
import { UserChannel } from '../creator/entities/user-channel.entity';
import { google } from 'googleapis';

describe('YouTubeOAuthService', () => {
  let service: YouTubeOAuthService;
  let youtubeTokenService: jest.Mocked<YouTubeTokenService>;
  let userChannelRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YouTubeOAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                GOOGLE_OAUTH_CLIENT_ID: 'test-client-id',
                GOOGLE_OAUTH_CLIENT_SECRET: 'test-client-secret',
                GOOGLE_OAUTH_REDIRECT_URI: 'http://localhost:3000/callback',
              };
              return config[key];
            }),
          },
        },
        {
          provide: YouTubeTokenService,
          useValue: {
            upsertRefreshToken: jest.fn(),
            updateChannelId: jest.fn(),
            getYouTubeClient: jest.fn(),
            getYouTubeAnalyticsClient: jest.fn(),
            revokeToken: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(YouTubeChannel),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            upsert: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserChannel),
          useValue: {
            upsert: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<YouTubeOAuthService>(YouTubeOAuthService);
    youtubeTokenService = module.get(YouTubeTokenService);
    userChannelRepo = module.get(getRepositoryToken(UserChannel));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAuthUrl', () => {
    it('should generate OAuth URL with userId in state', () => {
      const userId = 'user-123';
      const returnUrl = '/dashboard';

      const url = service.getAuthUrl(userId, returnUrl);

      // Should return a valid URL
      expect(url).toContain('https://accounts.google.com');
      expect(url).toContain('response_type=code');
      expect(url).toContain('access_type=offline');
    });

    it('should use default returnUrl when not provided', () => {
      const userId = 'user-456';

      const url = service.getAuthUrl(userId);

      expect(url).toBeDefined();
      expect(typeof url).toBe('string');
    });

    it('should include login_hint in OAuth URL when loginHint is provided', () => {
      const url = service.getAuthUrl(
        'user-789',
        '/dashboard',
        'user@gmail.com',
      );

      expect(url).toContain('login_hint=user%40gmail.com');
    });

    it('should not include login_hint in OAuth URL when loginHint is not provided', () => {
      const url = service.getAuthUrl('user-789', '/dashboard');

      expect(url).not.toContain('login_hint');
    });
  });

  describe('handleCallback', () => {
    it('should return success: false with error no_channel when account has no YouTube channels', async () => {
      // Create a valid state parameter
      const stateData = {
        userId: 'user-no-channel',
        timestamp: Date.now(),
        returnUrl: '/settings',
      };
      const state = Buffer.from(JSON.stringify(stateData)).toString(
        'base64url',
      );

      // Mock the oauth2Client.getToken and channels.list
      // Access the private oauth2Client to mock it
      const mockOAuth2Client = (service as any).oauth2Client;
      jest.spyOn(mockOAuth2Client, 'getToken').mockResolvedValue({
        tokens: {
          refresh_token: 'mock-refresh-token',
          access_token: 'mock-access-token',
        },
      });
      jest
        .spyOn(mockOAuth2Client, 'setCredentials')
        .mockImplementation(() => {});

      // Mock google.youtube to return empty channels
      const mockChannelsList = jest.fn().mockResolvedValue({
        data: { items: [] },
      });
      jest.spyOn(google, 'youtube').mockReturnValue({
        channels: { list: mockChannelsList },
      } as any);

      const result = await service.handleCallback('auth-code', state);

      expect(result.success).toBe(false);
      expect(result.error).toBe('no_channel');
      expect(result.userId).toBe('user-no-channel');
      expect(youtubeTokenService.upsertRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('syncChannelData', () => {
    it('should return requiresAuth: true when no YouTube client available', async () => {
      youtubeTokenService.getYouTubeClient.mockResolvedValue(null);

      const result = await service.syncChannelData('user-123');

      expect(result.success).toBe(false);
      expect(result.requiresAuth).toBe(true);
      expect(result.error).toContain('YouTube');
    });
  });

  describe('getChannelDataForEstimator', () => {
    it('should return connected: false when no YouTube client available', async () => {
      youtubeTokenService.getYouTubeClient.mockResolvedValue(null);

      const result = await service.getChannelDataForEstimator('user-123');

      expect(result.connected).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getAnalyticsReport', () => {
    it('should return error when no Analytics client available', async () => {
      youtubeTokenService.getYouTubeAnalyticsClient.mockResolvedValue(null);

      await expect(
        service.getAnalyticsReport('user-123', 'channel-456', 12),
      ).rejects.toThrow('Failed to fetch analytics data');
    });
  });

  describe('revokeConnection', () => {
    it('should delete UserChannel records and revoke token', async () => {
      userChannelRepo.delete.mockResolvedValue({ affected: 1 });
      youtubeTokenService.revokeToken.mockResolvedValue(undefined);

      await service.revokeConnection('user-123');

      expect(userChannelRepo.delete).toHaveBeenCalledWith({
        userId: 'user-123',
      });
      expect(youtubeTokenService.revokeToken).toHaveBeenCalledWith('user-123');
    });

    it('should call delete before revokeToken', async () => {
      const callOrder: string[] = [];
      userChannelRepo.delete.mockImplementation(async () => {
        callOrder.push('delete');
        return { affected: 1 };
      });
      youtubeTokenService.revokeToken.mockImplementation(async () => {
        callOrder.push('revokeToken');
      });

      await service.revokeConnection('user-456');

      expect(callOrder).toEqual(['delete', 'revokeToken']);
    });
  });

  describe('getMockChannelData', () => {
    it('should return random mock data with valid ranges', () => {
      const result = service.getMockChannelData();

      expect(result.connected).toBe(true);
      expect(result.channels).toHaveLength(1);

      const ch = result.channels[0];
      expect(ch.id).toMatch(/^UCmock_/);
      expect(ch.title).toBeDefined();
      expect(Number(ch.subscriberCount)).toBeGreaterThanOrEqual(10_000);
      expect(Number(ch.subscriberCount)).toBeLessThanOrEqual(500_000);
      expect(Number(ch.videoCount)).toBeGreaterThanOrEqual(20);
      expect(Number(ch.videoCount)).toBeLessThanOrEqual(500);
      expect(Number(ch.viewCount)).toBeGreaterThan(0);
      expect(ch.thumbnailUrl).toBeDefined();
    });

    it('should apply overrides when provided', () => {
      const result = service.getMockChannelData({
        title: 'Ghana Music Vibes',
        subscriberCount: '200000',
        viewCount: '5000000',
        videoCount: '300',
      });

      expect(result.channels[0].title).toBe('Ghana Music Vibes');
      expect(result.channels[0].subscriberCount).toBe('200000');
      expect(result.channels[0].viewCount).toBe('5000000');
      expect(result.channels[0].videoCount).toBe('300');
    });

    it('should use overrides only for provided fields', () => {
      const result = service.getMockChannelData({ title: 'Custom Title' });

      expect(result.channels[0].title).toBe('Custom Title');
      expect(Number(result.channels[0].subscriberCount)).toBeGreaterThanOrEqual(
        10_000,
      );
      expect(Number(result.channels[0].viewCount)).toBeGreaterThan(0);
    });
  });

  describe('getMockAnalyticsReport', () => {
    it('should return valid analytics report shape', () => {
      const result = service.getMockAnalyticsReport();

      expect(result.kind).toBe('youtubeAnalytics#resultTable');
      expect(result.columnHeaders).toHaveLength(3);
      expect(result.columnHeaders[0].name).toBe('country');
      expect(result.columnHeaders[1].name).toBe('views');
      expect(result.columnHeaders[2].name).toBe('subscribersGained');
    });

    it('should include PawaPay-supported African countries', () => {
      const result = service.getMockAnalyticsReport();
      const countryCodes = result.rows.map((row) => row[0]);

      expect(countryCodes).toContain('KE');
      expect(countryCodes).toContain('NG');
      expect(countryCodes).toContain('GH');
      expect(countryCodes).toContain('UG');
      expect(countryCodes).toContain('TZ');
      expect(countryCodes).toContain('ZA');
    });

    it('should have numeric values for views and subscribers', () => {
      const result = service.getMockAnalyticsReport();

      for (const row of result.rows) {
        expect(typeof row[1]).toBe('number');
        expect(typeof row[2]).toBe('number');
        expect(row[1]).toBeGreaterThan(0);
        expect(row[2]).toBeGreaterThan(0);
      }
    });
  });
});
