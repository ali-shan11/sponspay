import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { TermsService } from './terms.service';
import { Terms } from './entities/terms.entity';

describe('TermsService', () => {
  let service: TermsService;
  let repo: jest.Mocked<Repository<Terms>>;

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TermsService,
        {
          provide: DataSource,
          useValue: { getRepository: () => repo },
        },
      ],
    }).compile();

    service = module.get<TermsService>(TermsService);
  });

  it('should return latest terms', async () => {
    repo.find.mockResolvedValue([{ version: 2 } as Terms]);
    const result = await service.getLatest();
    expect(result?.version).toBe(2);
    expect(repo.find).toHaveBeenCalledWith({
      order: { version: 'desc' },
      take: 1,
    });
  });

  it('should create first version', async () => {
    repo.find.mockResolvedValue([]);
    repo.create.mockReturnValue({ version: 1, html: '<p>hi</p>' } as Terms);
    repo.save.mockResolvedValue({ version: 1 } as Terms);
    const result = await service.create('<p>hi</p>');
    expect(repo.create).toHaveBeenCalledWith({ html: '<p>hi</p>', version: 1 });
    expect(result.version).toBe(1);
  });

  it('should increment version when creating new terms', async () => {
    repo.find.mockResolvedValueOnce([{ version: 1 } as Terms]);
    repo.create.mockReturnValue({ version: 2, html: '<p>v2</p>' } as Terms);
    repo.save.mockResolvedValue({ version: 2 } as Terms);
    const result = await service.create('<p>v2</p>');
    expect(repo.create).toHaveBeenCalledWith({ html: '<p>v2</p>', version: 2 });
    expect(result.version).toBe(2);
  });
});
