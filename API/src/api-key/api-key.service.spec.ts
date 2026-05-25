import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyService } from './api-key.service';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { ApiKey as ApiKeyEntity } from './entities/api-key.entity';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let dataSource: jest.Mocked<DataSource>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<ApiKeyEntity>>;

  beforeEach(async () => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    } as any;

    const mockDataSource = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isApiKeyValid', () => {
    it('should return true for valid API key', async () => {
      const apiKey = 'valid-api-key';
      const mockApiKeyEntity = {
        id: 'uuid-1',
        apiKey: 'valid-api-key',
        description: 'Test API key',
        dateAdded: new Date(),
        banned: false,
      };
      queryBuilder.getOne.mockResolvedValue(mockApiKeyEntity);

      const result = await service.isApiKeyValid(apiKey);

      expect(result).toBe(true);
      expect(dataSource.createQueryBuilder).toHaveBeenCalledWith(
        ApiKeyEntity,
        'apiKey',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'apiKey.apiKey = :apiKey',
        { apiKey },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'apiKey.banned = false',
      );
      expect(queryBuilder.getOne).toHaveBeenCalled();
    });

    it('should return false for invalid API key', async () => {
      const apiKey = 'invalid-api-key';
      queryBuilder.getOne.mockResolvedValue(null);

      const result = await service.isApiKeyValid(apiKey);

      expect(result).toBe(false);
      expect(dataSource.createQueryBuilder).toHaveBeenCalledWith(
        ApiKeyEntity,
        'apiKey',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'apiKey.apiKey = :apiKey',
        { apiKey },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'apiKey.banned = false',
      );
      expect(queryBuilder.getOne).toHaveBeenCalled();
    });

    it('should return false for banned API key', async () => {
      const apiKey = 'banned-api-key';
      queryBuilder.getOne.mockResolvedValue(null); // Banned keys won't be returned due to andWhere condition

      const result = await service.isApiKeyValid(apiKey);

      expect(result).toBe(false);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'apiKey.banned = false',
      );
    });

    it('should handle database errors', async () => {
      const apiKey = 'test-api-key';
      const error = new Error('Database connection failed');
      queryBuilder.getOne.mockRejectedValue(error);

      await expect(service.isApiKeyValid(apiKey)).rejects.toThrow(error);
    });
  });
});
