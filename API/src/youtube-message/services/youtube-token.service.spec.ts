import { Test, TestingModule } from '@nestjs/testing';
import { YouTubeTokenService } from './youtube-token.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { YouTubeOAuthToken } from '../entities/youtube-oauth-token.entity';
import { Repository } from 'typeorm';
import { RedisService } from '../../redis/redis.service';
import { Logger } from '@nestjs/common';
import { google } from 'googleapis';

describe('YouTubeTokenService', () => {
  let service: YouTubeTokenService;
  let configService: jest.Mocked<ConfigService>;
  let tokenRepository: jest.Mocked<Repository<YouTubeOAuthToken>>;
  let mockRedisClient: any;

  const mockEncryptionKey =
    'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
  const mockUserId = 'user-123';
  const mockRefreshToken = 'ya29.refresh_token_abc123';
  const mockAccessToken = 'ya29.access_token_xyz456';

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'YOUTUBE_TOKEN_ENCRYPTION_KEY') return mockEncryptionKey;
        return null;
      }),
    };

    const mockTokenRepository = {
      upsert: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    // Mock ioredis client
    mockRedisClient = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    };

    const mockRedisService = {
      getPubClient: jest.fn().mockReturnValue(mockRedisClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YouTubeTokenService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(YouTubeOAuthToken),
          useValue: mockTokenRepository,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<YouTubeTokenService>(YouTubeTokenService);
    configService = module.get(ConfigService);
    tokenRepository = module.get(getRepositoryToken(YouTubeOAuthToken));

    // Mock logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upsertRefreshToken', () => {
    it('should encrypt and upsert refresh token', async () => {
      tokenRepository.upsert.mockResolvedValue(undefined as any);

      await service.upsertRefreshToken(mockUserId, mockRefreshToken);

      expect(tokenRepository.upsert).toHaveBeenCalledWith(
        {
          userId: mockUserId,
          channelId: null,
          encryptedRefreshToken: expect.stringMatching(
            /^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/,
          ),
        },
        ['userId'],
      );
    });

    it('should produce different ciphertext for same plaintext due to random IV', async () => {
      tokenRepository.upsert.mockResolvedValue(undefined as any);

      await service.upsertRefreshToken(mockUserId, mockRefreshToken);
      const firstCall = tokenRepository.upsert.mock.calls[0][0] as any;

      await service.upsertRefreshToken(mockUserId, mockRefreshToken);
      const secondCall = tokenRepository.upsert.mock.calls[1][0] as any;

      // Different encrypted values due to random IV
      expect(firstCall.encryptedRefreshToken).not.toBe(
        secondCall.encryptedRefreshToken,
      );
    });

    it('should handle encryption errors gracefully', async () => {
      // Mock configService to return invalid key
      configService.get.mockReturnValueOnce('invalid-short-key');

      await expect(
        service.upsertRefreshToken(mockUserId, mockRefreshToken),
      ).rejects.toThrow();
    });
  });

  describe('getYouTubeClient', () => {
    it('should return YouTube client when access token is available', async () => {
      mockRedisClient.get.mockResolvedValue(mockAccessToken);

      const client = await service.getYouTubeClient(mockUserId);

      expect(client).toBeDefined();
      expect(client).toHaveProperty('comments');
      expect(client).toHaveProperty('liveChatMessages');
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        `youtube:access_token:${mockUserId}`,
      );
    });

    it('should return null when no access token can be obtained', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      tokenRepository.findOne.mockResolvedValue(null);

      const client = await service.getYouTubeClient(mockUserId);

      expect(client).toBeNull();
    });

    it('should refresh token when cache misses', async () => {
      const encryptedToken = service['encryptToken'](mockRefreshToken);
      const mockTokenEntity: YouTubeOAuthToken = {
        id: 'token-123',
        userId: mockUserId,
        encryptedRefreshToken: encryptedToken,
        channelId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: null as any,
      };

      mockRedisClient.get.mockResolvedValue(null); // Cache miss
      tokenRepository.findOne.mockResolvedValue(mockTokenEntity);

      // Mock the OAuth2 client refresh
      const mockOAuth2Client = {
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn().mockResolvedValue({
          credentials: { access_token: mockAccessToken },
        }),
      };
      jest
        .spyOn(google.auth, 'OAuth2')
        .mockReturnValue(mockOAuth2Client as any);

      const client = await service.getYouTubeClient(mockUserId);

      expect(client).toBeDefined();
      expect(mockOAuth2Client.refreshAccessToken).toHaveBeenCalled();
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `youtube:access_token:${mockUserId}`,
        3000,
        mockAccessToken,
      );
    });
  });

  describe('getFreshAccessToken', () => {
    it('should return cached access token when available', async () => {
      mockRedisClient.get.mockResolvedValue(mockAccessToken);

      const token = await service.getFreshAccessToken(mockUserId);

      expect(token).toBe(mockAccessToken);
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        `youtube:access_token:${mockUserId}`,
      );
    });

    it('should return null when no refresh token exists', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      tokenRepository.findOne.mockResolvedValue(null);

      const token = await service.getFreshAccessToken(mockUserId);

      expect(token).toBeNull();
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('No YouTube token found'),
      );
    });

    it('should decrypt and refresh token when cache misses', async () => {
      const encryptedToken = service['encryptToken'](mockRefreshToken);
      const mockTokenEntity: YouTubeOAuthToken = {
        id: 'token-123',
        userId: mockUserId,
        encryptedRefreshToken: encryptedToken,
        channelId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: null as any,
      };

      mockRedisClient.get.mockResolvedValue(null);
      tokenRepository.findOne.mockResolvedValue(mockTokenEntity);

      const mockOAuth2Client = {
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn().mockResolvedValue({
          credentials: { access_token: mockAccessToken },
        }),
      };
      jest
        .spyOn(google.auth, 'OAuth2')
        .mockReturnValue(mockOAuth2Client as any);

      const token = await service.getFreshAccessToken(mockUserId);

      expect(token).toBe(mockAccessToken);
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `youtube:access_token:${mockUserId}`,
        3000,
        mockAccessToken,
      );
    });

    it('should handle OAuth refresh errors gracefully', async () => {
      const encryptedToken = service['encryptToken'](mockRefreshToken);
      const mockTokenEntity: YouTubeOAuthToken = {
        id: 'token-123',
        userId: mockUserId,
        encryptedRefreshToken: encryptedToken,
        channelId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: null as any,
      };

      mockRedisClient.get.mockResolvedValue(null);
      tokenRepository.findOne.mockResolvedValue(mockTokenEntity);

      const mockOAuth2Client = {
        setCredentials: jest.fn(),
        refreshAccessToken: jest
          .fn()
          .mockRejectedValue(new Error('Token revoked')),
      };
      jest
        .spyOn(google.auth, 'OAuth2')
        .mockReturnValue(mockOAuth2Client as any);

      const token = await service.getFreshAccessToken(mockUserId);

      expect(token).toBeNull();
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to refresh access token'),
      );
    });
  });

  describe('revokeToken', () => {
    it('should delete token from database and evict from cache', async () => {
      tokenRepository.delete.mockResolvedValue({ affected: 1 } as any);
      mockRedisClient.del.mockResolvedValue(1);

      await service.revokeToken(mockUserId);

      expect(tokenRepository.delete).toHaveBeenCalledWith({
        userId: mockUserId,
      });
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        `youtube:access_token:${mockUserId}`,
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Revoked YouTube token'),
      );
    });

    it('should handle deletion errors gracefully', async () => {
      const deleteError = new Error('Database error');
      tokenRepository.delete.mockRejectedValue(deleteError);

      await expect(service.revokeToken(mockUserId)).rejects.toThrow(
        deleteError,
      );
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to revoke token for user'),
      );
    });
  });

  describe('encryption/decryption', () => {
    it('should correctly encrypt and decrypt tokens', () => {
      const plaintext = 'test_refresh_token_12345';
      const encrypted = service['encryptToken'](plaintext);
      const decrypted = service['decryptToken'](encrypted);

      expect(decrypted).toBe(plaintext);
      expect(encrypted).toMatch(/^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);
    });

    it('should produce format with iv:authTag:ciphertext', () => {
      const plaintext = 'test_token';
      const encrypted = service['encryptToken'](plaintext);
      const parts = encrypted.split(':');

      expect(parts).toHaveLength(3);
      expect(parts[0]).toHaveLength(32); // 16-byte IV as hex
      expect(parts[1]).toHaveLength(32); // 16-byte auth tag as hex
      expect(parts[2].length).toBeGreaterThan(0); // Ciphertext
    });

    it('should fail decryption with tampered auth tag', () => {
      const plaintext = 'test_token';
      const encrypted = service['encryptToken'](plaintext);
      const parts = encrypted.split(':');

      // Tamper with auth tag by flipping the first character
      const authTag = parts[1];
      const firstChar = authTag[0];
      const flippedChar = firstChar === '0' ? 'f' : '0';
      parts[1] = flippedChar + authTag.slice(1);
      const tamperedEncrypted = parts.join(':');

      expect(() => service['decryptToken'](tamperedEncrypted)).toThrow();
    });
  });
});
