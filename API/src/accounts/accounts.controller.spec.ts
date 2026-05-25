import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { AuditLogService } from './services/audit-log.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

jest.mock('@nestjs/swagger', () => ({
  ApiTags: () => () => undefined,
  ApiSecurity: () => () => undefined,
  ApiOperation: () => () => undefined,
  ApiExtension: () => () => undefined,
  ApiOkResponse: () => () => undefined,
  ApiUnauthorizedResponse: () => () => undefined,
  ApiForbiddenResponse: () => () => undefined,
  ApiResponse: () => () => undefined,
  ApiProperty: () => () => undefined,
  ApiPropertyOptional: () => () => undefined,
}));

describe('AccountsController', () => {
  let controller: AccountsController;
  let service: AccountsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [
        {
          provide: AccountsService,
          useValue: {
            findAllForCreator: jest.fn().mockResolvedValue([]),
            listProviderCountries: jest.fn().mockResolvedValue([]),
            createForCreator: jest.fn().mockResolvedValue({}),
            updateForCreator: jest.fn().mockResolvedValue({}),
            verifyAccount: jest.fn().mockResolvedValue({}),
            resendVerification: jest.fn().mockResolvedValue({
              alreadyVerified: false,
              message: 'Verification code sent successfully',
              codeSent: true,
            }),
            softDelete: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            getAccountAuditLogs: jest
              .fn()
              .mockResolvedValue({ logs: [], total: 0 }),
          },
        },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AccountsController>(AccountsController);
    service = module.get<AccountsService>(AccountsService);
  });

  it('findMine delegates to service', async () => {
    await controller.findMine({ user: { user_id: 'uid' } } as any);
    expect(service.findAllForCreator).toHaveBeenCalledWith('uid');
  });

  it('listCountries delegates to service', async () => {
    await controller.listCountries();
    expect(service.listProviderCountries).toHaveBeenCalled();
  });

  it('create delegates to service', async () => {
    const dto: any = { phoneNumber: '+1' };
    await controller.create({ user: { uid: 'uid' } } as any, dto);
    expect(service.createForCreator).toHaveBeenCalled();
  });

  it('update delegates to service', async () => {
    const dto: any = {};
    await controller.update({ user: { user_id: 'uid' } } as any, 'a1', dto);
    expect(service.updateForCreator).toHaveBeenCalledWith('uid', 'a1', dto);
  });

  it('verify delegates to service', async () => {
    const dto: any = { code: '123456' };
    await controller.verify({ user: { user_id: 'uid' } } as any, 'a1', dto);
    expect(service.verifyAccount).toHaveBeenCalledWith('uid', 'a1', dto);
  });

  it('resend delegates to service', async () => {
    await controller.resend({ user: { uid: 'uid' } } as any, 'a1');
    expect(service.resendVerification).toHaveBeenCalledWith('uid', 'a1');
  });

  it('remove delegates to service', async () => {
    await controller.remove({ user: { uid: 'uid' } } as any, 'a1');
    expect(service.softDelete).toHaveBeenCalledWith('uid', 'a1');
  });
});

describe('AccountsController (HTTP)', () => {
  let app: INestApplication;
  let serviceMock: {
    findAllForCreator: jest.Mock;
    listProviderCountries: jest.Mock;
    createForCreator: jest.Mock;
    updateForCreator: jest.Mock;
    verifyAccount: jest.Mock;
    resendVerification: jest.Mock;
    softDelete: jest.Mock;
  };

  beforeEach(async () => {
    serviceMock = {
      findAllForCreator: jest.fn().mockResolvedValue([]),
      listProviderCountries: jest
        .fn()
        .mockResolvedValue([{ country: 'Kenya', countryCode: 'KEN' }]),
      createForCreator: jest.fn().mockResolvedValue({}),
      updateForCreator: jest.fn().mockResolvedValue({}),
      verifyAccount: jest.fn().mockResolvedValue({ success: true }),
      resendVerification: jest.fn().mockResolvedValue({
        alreadyVerified: false,
        message: 'Verification code sent successfully',
        codeSent: true,
      }),
      softDelete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [
        {
          provide: AccountsService,
          useValue: serviceMock,
        },
        {
          provide: AuditLogService,
          useValue: {
            getAccountAuditLogs: jest
              .fn()
              .mockResolvedValue({ logs: [], total: 0 }),
          },
        },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /accounts/countries returns provider countries', async () => {
    serviceMock.listProviderCountries.mockResolvedValue([
      { country: 'Kenya', countryCode: 'KEN' },
      { country: 'Uganda', countryCode: 'UGA' },
    ]);

    const response = await request(app.getHttpServer())
      .get('/accounts/countries')
      .expect(200);

    expect(response.body).toEqual([
      { country: 'Kenya', countryCode: 'KEN' },
      { country: 'Uganda', countryCode: 'UGA' },
    ]);
  });

  it('POST /accounts/:id/verify forwards payload', async () => {
    serviceMock.verifyAccount.mockResolvedValue({ id: 'a1', isVerified: true });

    const response = await request(app.getHttpServer())
      .post('/accounts/a1/verify')
      .send({ code: '123456' })
      .expect(201);

    expect(response.body).toEqual({ id: 'a1', isVerified: true });
    expect(serviceMock.verifyAccount).toHaveBeenCalledWith(undefined, 'a1', {
      code: '123456',
    });
  });

  it('POST /accounts/:id/resend-verification returns response with verification status', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounts/a1/resend-verification')
      .expect(201);

    expect(response.body).toEqual({
      alreadyVerified: false,
      message: 'Verification code sent successfully',
      codeSent: true,
    });
    expect(serviceMock.resendVerification).toHaveBeenCalled();
  });

  it('DELETE /accounts/:id calls softDelete and returns 204', async () => {
    await request(app.getHttpServer()).delete('/accounts/a1').expect(204);

    expect(serviceMock.softDelete).toHaveBeenCalledWith(undefined, 'a1');
  });
});
