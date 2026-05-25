import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private pubClient: Redis;
  private subClient: Redis;

  constructor(private configService: ConfigService) {
    const redisUrl =
      this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';

    this.logger.log(`Connecting to Redis at ${redisUrl}`);

    this.pubClient = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.log(`Redis retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: null, // CRITICAL: null = infinite retries without throwing
      enableOfflineQueue: true, // Queue commands when disconnected
      reconnectOnError: (err) => {
        this.logger.warn(`Redis reconnecting due to error: ${err.message}`);
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true; // Reconnect on specific errors
        }
        return false;
      },
    });

    this.subClient = this.pubClient.duplicate();

    this.pubClient.on('connect', () => {
      this.logger.log('Redis pub client connected');
    });

    this.subClient.on('connect', () => {
      this.logger.log('Redis sub client connected');
    });

    this.pubClient.on('error', (err) => {
      this.logger.error('Redis pub client error:', err);
    });

    this.subClient.on('error', (err) => {
      this.logger.error('Redis sub client error:', err);
    });
  }

  getPubClient(): Redis {
    return this.pubClient;
  }

  getSubClient(): Redis {
    return this.subClient;
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Redis connections');
    await this.pubClient.quit();
    await this.subClient.quit();
  }
}
