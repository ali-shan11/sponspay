import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminDevService } from './admin-dev.service';
import { User } from '../creator/entities/user.entity';
import { Transaction } from '../transaction/entities/transaction.entity';
import { Currency } from '../transaction/entities/currency.entity';
import { TransactionStatus } from '../transaction/entities/transaction-status.entity';
import { Account } from '../accounts/entities/account.entity';
import { UserChannel } from '../creator/entities/user-channel.entity';
import { ProviderCacheService } from '../pawapay/provider-cache.service';

describe('AdminDevService', () => {
  let service: AdminDevService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
      findOneOrFail: jest.fn(),
      upsert: jest.fn(),
    };

    const mockProviderCacheService = {
      getProviders: jest.fn().mockResolvedValue([]),
      getProvidersByCountry: jest.fn().mockResolvedValue([]),
      validateProvider: jest.fn(),
      clearCache: jest.fn(),
    };

    configService = {
      get: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDevService,
        { provide: ConfigService, useValue: configService },
        { provide: getRepositoryToken(User), useValue: mockRepo },
        { provide: getRepositoryToken(UserChannel), useValue: mockRepo },
        { provide: getRepositoryToken(Transaction), useValue: mockRepo },
        { provide: getRepositoryToken(Currency), useValue: mockRepo },
        { provide: getRepositoryToken(TransactionStatus), useValue: mockRepo },
        { provide: getRepositoryToken(Account), useValue: mockRepo },
        { provide: ProviderCacheService, useValue: mockProviderCacheService },
      ],
    }).compile();

    service = module.get<AdminDevService>(AdminDevService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
