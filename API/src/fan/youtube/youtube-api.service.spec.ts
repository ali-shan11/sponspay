import { Test, TestingModule } from '@nestjs/testing';
import { YouTubeApiService, YouTubeVideoInfo } from './youtube-api.service';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';

describe('YouTubeApiService', () => {
  let service: YouTubeApiService;
  let redisClient: { get: jest.Mock; setex: jest.Mock };

  const fakeServiceAccount = JSON.stringify({ project_id: 'proj' });

  beforeEach(async () => {
    const mockConfig = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'FIREBASE_SERVICE_ACCOUNT') return fakeServiceAccount;
        return undefined;
      }),
    } as any as ConfigService;

    redisClient = { get: jest.fn(), setex: jest.fn() };
    const mockRedisService = {
      getPubClient: jest.fn().mockReturnValue(redisClient),
    } as any as RedisService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YouTubeApiService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<YouTubeApiService>(YouTubeApiService);

    // Replace the internal youtube client with a controllable mock
    (service as any).youtube = {
      search: {
        list: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('returns cached video info when present', async () => {
    const cached: YouTubeVideoInfo = {
      videoId: 'vid123',
      embedUrl: 'https://www.youtube.com/embed/vid123',
      isLiveStream: false,
      title: 'Cached',
      description: 'cached',
      thumbnailUrl: 'thumb',
    };

    redisClient.get.mockResolvedValue(JSON.stringify(cached));

    const res = await service.getVideoInfo('channel-1');

    expect(redisClient.get).toHaveBeenCalledWith('youtube:live:channel-1');
    expect(res).toEqual(cached);
    expect((service as any).youtube.search.list).not.toHaveBeenCalled();
  });

  it('fetches and returns live stream when present and caches it', async () => {
    redisClient.get.mockResolvedValue(null);

    const liveItem = {
      id: { videoId: 'live1' },
      snippet: {
        title: 'Live Now',
        description: 'desc',
        thumbnails: { high: { url: 'high' } },
      },
    };

    // First call (live) returns the live item
    (service as any).youtube.search.list.mockResolvedValueOnce({
      data: { items: [liveItem] },
    });

    const res = await service.getVideoInfo('channel-live');

    expect((service as any).youtube.search.list).toHaveBeenCalled();
    expect(res).toMatchObject({
      videoId: 'live1',
      isLiveStream: true,
      title: 'Live Now',
    });

    expect(redisClient.setex).toHaveBeenCalledWith(
      'youtube:live:channel-live',
      expect.any(Number),
      expect.any(String),
    );
  });

  it('falls back to latest video when no live stream and caches it', async () => {
    redisClient.get.mockResolvedValue(null);

    const noLive = { data: { items: [] } };
    const latestItem = {
      id: { videoId: 'latest1' },
      snippet: {
        title: 'Latest',
        description: 'desc2',
        thumbnails: { default: { url: 'def' } },
      },
    };

    // When called for live -> return empty list
    (service as any).youtube.search.list.mockResolvedValueOnce(noLive);
    // When called for latest -> return latestItem
    (service as any).youtube.search.list.mockResolvedValueOnce({
      data: { items: [latestItem] },
    });

    const res = await service.getVideoInfo('channel-2');

    expect((service as any).youtube.search.list).toHaveBeenCalledTimes(2);
    expect(res).toMatchObject({
      videoId: 'latest1',
      isLiveStream: false,
      title: 'Latest',
    });

    expect(redisClient.setex).toHaveBeenCalledWith(
      'youtube:live:channel-2',
      expect.any(Number),
      expect.any(String),
    );
  });
});
