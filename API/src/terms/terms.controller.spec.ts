import { Test, TestingModule } from '@nestjs/testing';
import { TermsController } from './terms.controller';
import { TermsService } from './terms.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

describe('TermsController', () => {
  let controller: TermsController;
  let service: jest.Mocked<TermsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TermsController],
      providers: [
        {
          provide: TermsService,
          useValue: { getLatest: jest.fn(), create: jest.fn() },
        },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TermsController>(TermsController);
    service = module.get(TermsService);
  });

  it('should return latest terms', async () => {
    service.getLatest.mockResolvedValue({ version: 1, html: 'hi' } as any);
    const result = await controller.getLatest();
    expect(result.version).toBe(1);
    expect(service.getLatest).toHaveBeenCalled();
  });

  it('should create terms', async () => {
    service.create.mockResolvedValue({ version: 1 } as any);
    const result = await controller.create({ html: 'hi' });
    expect(service.create).toHaveBeenCalledWith('hi');
    expect(result.version).toBe(1);
  });
});
