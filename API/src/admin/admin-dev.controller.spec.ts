import { Test, TestingModule } from '@nestjs/testing';
import { AdminDevController } from './admin-dev.controller';
import { AdminDevService } from './admin-dev.service';
import { NonProdGuard } from './guards/non-prod.guard';

describe('AdminDevController', () => {
  let controller: AdminDevController;
  let service: jest.Mocked<AdminDevService>;

  beforeEach(async () => {
    service = {
      preSeedTransactions: jest.fn(),
      resetUser: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminDevController],
      providers: [{ provide: AdminDevService, useValue: service }],
    })
      .overrideGuard(NonProdGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminDevController>(AdminDevController);
  });

  describe('preSeedTransactions', () => {
    it('should call service method with firebaseUid', async () => {
      const mockResult = {
        firebaseUid: 'test-uid',
        userId: 'user-id',
        transactionsCreated: 500,
        providersUsed: 6,
        accountsEnsured: 2,
      };
      service.preSeedTransactions.mockResolvedValue(mockResult);

      const result = await controller.preSeedTransactions({
        firebaseUid: 'test-uid',
      });

      expect(service.preSeedTransactions).toHaveBeenCalledWith('test-uid');
      expect(result).toEqual(mockResult);
    });
  });

  describe('resetUser', () => {
    it('should call service method with firebaseUid', async () => {
      const mockResult = {
        firebaseUid: 'test-uid',
        userId: 'user-id',
        transactionsDeleted: 10,
        accountsDeleted: 2,
      };
      service.resetUser.mockResolvedValue(mockResult);

      const result = await controller.resetUser({ firebaseUid: 'test-uid' });

      expect(service.resetUser).toHaveBeenCalledWith('test-uid');
      expect(result).toEqual(mockResult);
    });
  });
});
