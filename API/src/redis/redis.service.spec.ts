import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

// Create mock functions that will be shared
const mockQuit = jest.fn().mockResolvedValue('OK');
const mockOn = jest.fn();
const mockDuplicate = jest.fn().mockReturnValue({
  on: mockOn,
  quit: mockQuit,
});

// Mock the ioredis module with inline implementation
jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      on: mockOn,
      quit: mockQuit,
      duplicate: mockDuplicate,
    })),
  };
});

// Import the mocked constructor after the mock is defined
import Redis from 'ioredis';
const MockedRedis = Redis as jest.MockedClass<typeof Redis>;

describe('RedisService', () => {
  let service: RedisService;
  let configService: ConfigService;

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'REDIS_URL') {
                return 'redis://localhost:6379';
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
    service = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should retrieve REDIS_URL from config', () => {
    expect(configService.get).toHaveBeenCalledWith('REDIS_URL');
  });

  it('should create Redis client with correct URL and options', () => {
    expect(MockedRedis).toHaveBeenCalledWith('redis://localhost:6379', {
      retryStrategy: expect.any(Function),
      maxRetriesPerRequest: null,
      enableOfflineQueue: true,
      reconnectOnError: expect.any(Function),
    });
  });

  it('should create duplicate client for subscription', () => {
    expect(mockDuplicate).toHaveBeenCalled();
  });

  it('should register event listeners for both clients', () => {
    // Expect connect and error listeners for both pub and sub clients
    expect(mockOn).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should return pub client', () => {
    const pubClient = service.getPubClient();
    expect(pubClient).toBeDefined();
    expect(pubClient).toHaveProperty('on');
    expect(pubClient).toHaveProperty('quit');
  });

  it('should return sub client', () => {
    const subClient = service.getSubClient();
    expect(subClient).toBeDefined();
    expect(subClient).toHaveProperty('on');
    expect(subClient).toHaveProperty('quit');
  });

  it('should quit both clients on module destroy', async () => {
    await service.onModuleDestroy();
    // Both pub and sub clients should call quit
    expect(mockQuit).toHaveBeenCalledTimes(2);
  });
});
