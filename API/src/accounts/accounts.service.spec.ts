import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from './accounts.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Account } from './entities/account.entity';
import { User } from '../creator/entities/user.entity';
import { Repository, ObjectLiteral, DataSource } from 'typeorm';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { ProviderCountryDto } from './dto/provider-country.dto';
import { AccountVerification } from './entities/account-verification.entity';
import { InfobipService } from '../infobip/infobip.service';
import { VerifyAccountDto } from './dto/verify-account.dto';
import { ResendVerificationResponseDto } from './dto/resend-verification-response.dto';
import { AccountsConfig } from './config/accounts.config';
import { AuditLogService } from './services/audit-log.service';
import { ProviderCacheService } from '../pawapay/provider-cache.service';
import { Provider } from '../pawapay/interfaces/provider.interface';

function createMockRepo<T extends ObjectLiteral>() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<Repository<T>>;
}

// Helper to create mock provider
function createMockProvider(overrides: Partial<Provider> = {}): Provider {
  return {
    name: 'MTN_MOMO_KEN',
    country: 'Kenya',
    countryCode: 'KEN',
    currency: 'KES',
    supportsDecimals: true,
    minDepositLimit: 10,
    maxDepositLimit: 10000,
    ...overrides,
  };
}

// Helper to create mock account with new denormalized structure
function createMockAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'a1',
    phoneNumber: '+123',
    fullName: 'John Doe',
    nickname: null,
    providerName: 'MTN_MOMO_KEN',
    providerCountry: 'Kenya',
    providerCountryCode: 'KEN',
    currencyCode: 'KES',
    isVerified: false,
    verifiedAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Account;
}

describe('AccountsService', () => {
  let service: AccountsService;
  let accountRepo: jest.Mocked<Repository<Account>>;
  let providerCacheService: jest.Mocked<ProviderCacheService>;
  let userRepo: jest.Mocked<Repository<User>>;
  let verificationRepo: jest.Mocked<Repository<AccountVerification>>;
  let infobipService: { sendSms: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    accountRepo = createMockRepo<Account>();
    providerCacheService = {
      getProviders: jest.fn(),
      getProvidersByCountry: jest.fn(),
      validateProvider: jest.fn(),
      clearCache: jest.fn(),
    } as unknown as jest.Mocked<ProviderCacheService>;
    userRepo = createMockRepo<User>();
    verificationRepo = createMockRepo<AccountVerification>();
    infobipService = { sendSms: jest.fn() };
    configService = { get: jest.fn() };

    // Mock the ANONYMIZATION_SALT config value
    configService.get.mockImplementation((key: string) => {
      if (key === 'ANONYMIZATION_SALT') {
        return 'test_salt_for_anonymization_testing_purposes';
      }
      return undefined;
    });

    // Mock DataSource and QueryRunner for transaction support
    const mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === Account) return accountRepo;
          if (entity === AccountVerification) return verificationRepo;
          if (entity === User) return userRepo;
          return createMockRepo();
        }),
      },
    };

    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: getRepositoryToken(Account), useValue: accountRepo },
        { provide: ProviderCacheService, useValue: providerCacheService },
        { provide: getRepositoryToken(User), useValue: userRepo },
        {
          provide: getRepositoryToken(AccountVerification),
          useValue: verificationRepo,
        },
        { provide: InfobipService, useValue: infobipService },
        { provide: ConfigService, useValue: configService },
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: AccountsConfig,
          useValue: {
            codeValidityMs: 300000,
            resendCooldownMs: 20000,
            maxFailedAttempts: 3,
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            logAccountCreated: jest.fn(),
            logAccountUpdated: jest.fn(),
            logAccountDeleted: jest.fn(),
            logAccountRestored: jest.fn(),
            logAccountAnonymized: jest.fn(),
            logAccountTakeover: jest.fn(),
            logVerificationSent: jest.fn(),
            logVerificationAttempted: jest.fn(),
            logVerificationExpired: jest.fn(),
            logVerificationResent: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
  });

  it('findAllForCreator maps entities to dto and filters for verified accounts only', async () => {
    accountRepo.find.mockResolvedValue([
      createMockAccount({
        id: '1',
        phoneNumber: '+123',
        fullName: 'John Doe',
        nickname: null,
        providerName: 'MPesa',
        providerCountry: 'Kenya',
        isVerified: true,
        verifiedAt: new Date('2023-12-01T10:30:00.000Z'),
      }),
    ]);
    const result = await service.findAllForCreator('uid');
    expect(result).toEqual([
      {
        id: '1',
        phoneNumber: '+123',
        fullName: 'John Doe',
        nickname: null,
        providerName: 'MPesa',
        country: 'Kenya',
        isVerified: true,
        verifiedAt: new Date('2023-12-01T10:30:00.000Z'),
      },
    ]);
    expect(accountRepo.find).toHaveBeenCalledWith({
      where: {
        owner: { firebaseUid: 'uid' },
        isVerified: true,
      },
      withDeleted: false,
    });
  });

  it('listProviderCountries returns sorted unique country/countryCode pairs', async () => {
    providerCacheService.getProviders.mockResolvedValue([
      createMockProvider({ country: 'Kenya', countryCode: 'KEN' }),
      createMockProvider({ country: 'Uganda', countryCode: 'UGA' }),
      createMockProvider({ country: 'Kenya', countryCode: 'KEN' }),
      createMockProvider({ country: 'Nigeria', countryCode: 'NGA' }),
    ]);

    const result = await service.listProviderCountries();

    expect(providerCacheService.getProviders).toHaveBeenCalled();
    const expected: ProviderCountryDto[] = [
      { country: 'Kenya', countryCode: 'KEN' },
      { country: 'Nigeria', countryCode: 'NGA' },
      { country: 'Uganda', countryCode: 'UGA' },
    ];
    expect(result).toEqual(expected);
  });

  it('createForCreator saves account and issues verification when no existing account', async () => {
    const provider = createMockProvider({ name: 'MPesa', country: 'Kenya' });
    userRepo.findOne.mockResolvedValue({
      id: 'u1',
      firebaseUid: 'uid',
    } as User);
    providerCacheService.validateProvider.mockResolvedValue(provider);
    accountRepo.findOne.mockResolvedValue(null); // No existing account
    accountRepo.create.mockReturnValue({ owner: { id: 'u1' } } as Account);
    accountRepo.save.mockResolvedValue(
      createMockAccount({
        id: 'a1',
        phoneNumber: '+1',
        fullName: 'John',
        nickname: 'My Account',
        providerName: 'MPesa',
        providerCountry: 'Kenya',
        owner: { id: 'u1' } as User,
        isVerified: false,
        verifiedAt: null,
      }),
    );
    verificationRepo.create.mockImplementation(
      (input) => input as AccountVerification,
    );
    verificationRepo.save.mockImplementation(async (input) => ({
      ...(input as AccountVerification),
      id: 'v1',
      createdAt: new Date(Date.now() - 25_000),
    }));
    infobipService.sendSms.mockResolvedValue({});

    const dto: CreateAccountDto = {
      phoneNumber: '+1',
      fullName: 'John',
      nickname: 'My Account',
      providerName: 'MPesa',
      countryCode: 'KEN',
    };
    const result = await service.createForCreator('uid', dto);
    expect(result.account.providerName).toBe('MPesa');
    expect(result.account.nickname).toBe('My Account');
    expect(accountRepo.save).toHaveBeenCalled();
    expect(verificationRepo.save).toHaveBeenCalled();
    expect(infobipService.sendSms).toHaveBeenCalledWith(
      expect.objectContaining({ to: '+1' }),
    );
  });

  it('createForCreator takes over unverified account from different creator', async () => {
    const newOwner = { id: 'u2', firebaseUid: 'uid2' } as User;
    const oldOwner = { id: 'u1', firebaseUid: 'uid1' } as User;
    const provider = createMockProvider({ name: 'MPesa', country: 'Kenya' });

    userRepo.findOne.mockResolvedValue(newOwner);
    providerCacheService.validateProvider.mockResolvedValue(provider);

    // Existing unverified account
    const existingAccount = createMockAccount({
      id: 'a1',
      phoneNumber: '+1',
      fullName: 'Old Name',
      nickname: 'Old Nickname',
      owner: oldOwner,
      providerName: 'MPesa',
      providerCountry: 'Kenya',
      isVerified: false,
      verifiedAt: null,
    });

    accountRepo.findOne.mockResolvedValue(existingAccount);
    verificationRepo.update.mockResolvedValue({ affected: 1 } as any);
    accountRepo.save.mockImplementation(async (account) => account as Account);
    verificationRepo.create.mockImplementation(
      (input) => input as AccountVerification,
    );
    verificationRepo.save.mockImplementation(async (input) => ({
      ...(input as AccountVerification),
      id: 'v1',
      createdAt: new Date(),
    }));
    infobipService.sendSms.mockResolvedValue({});

    const dto: CreateAccountDto = {
      phoneNumber: '+1',
      fullName: 'New Name',
      nickname: 'New Nickname',
      providerName: 'MPesa',
      countryCode: 'KEN',
    };

    const result = await service.createForCreator('uid2', dto);

    expect(result.account.fullName).toBe('New Name');
    expect(result.account.nickname).toBe('New Nickname');
    expect(verificationRepo.update).toHaveBeenCalledWith(
      { account: { id: 'a1' } },
      { isDisabled: true },
    );
    expect(accountRepo.save).toHaveBeenCalled();
    expect(infobipService.sendSms).toHaveBeenCalled();
  });

  it('createForCreator returns existing account when same creator tries to add verified account', async () => {
    const owner = { id: 'u1', firebaseUid: 'uid' } as User;
    const provider = createMockProvider({ name: 'MPesa', country: 'Kenya' });

    userRepo.findOne.mockResolvedValue(owner);
    providerCacheService.validateProvider.mockResolvedValue(provider);

    // Existing verified account owned by same creator
    const existingAccount = createMockAccount({
      id: 'a1',
      phoneNumber: '+1',
      fullName: 'John Doe',
      nickname: 'My Account',
      owner,
      providerName: 'MPesa',
      providerCountry: 'Kenya',
      isVerified: true,
      verifiedAt: new Date(),
    });

    accountRepo.findOne.mockResolvedValue(existingAccount);

    const dto: CreateAccountDto = {
      phoneNumber: '+1',
      fullName: 'Different Name',
      providerName: 'MPesa',
      countryCode: 'KEN',
    };

    const result = await service.createForCreator('uid', dto);

    expect(result.account.fullName).toBe('John Doe'); // Returns existing account data
    expect(result.account.nickname).toBe('My Account');
    expect(result.account.isVerified).toBe(true);
    expect(result.message).toBe(
      'This account is already added to your profile.',
    );
    expect(result.alreadyExists).toBe(true);
    expect(accountRepo.save).not.toHaveBeenCalled(); // No save operation
    expect(infobipService.sendSms).not.toHaveBeenCalled(); // No SMS sent
  });

  it('createForCreator throws error when different creator tries to claim verified account', async () => {
    const newOwner = { id: 'u2', firebaseUid: 'uid2' } as User;
    const oldOwner = { id: 'u1', firebaseUid: 'uid1' } as User;
    const provider = createMockProvider({ name: 'MPesa', country: 'Kenya' });

    userRepo.findOne.mockResolvedValue(newOwner);
    providerCacheService.validateProvider.mockResolvedValue(provider);

    // Existing verified account owned by different creator
    const existingAccount = createMockAccount({
      id: 'a1',
      phoneNumber: '+1',
      fullName: 'John Doe',
      owner: oldOwner,
      providerName: 'MPesa',
      providerCountry: 'Kenya',
      isVerified: true,
      verifiedAt: new Date(),
    });

    accountRepo.findOne.mockResolvedValue(existingAccount);

    const dto: CreateAccountDto = {
      phoneNumber: '+1',
      fullName: 'Different Name',
      providerName: 'MPesa',
      countryCode: 'KEN',
    };

    await expect(service.createForCreator('uid2', dto)).rejects.toThrow(
      'There is an issue creating your account, please contact support.',
    );

    expect(accountRepo.save).not.toHaveBeenCalled();
    expect(infobipService.sendSms).not.toHaveBeenCalled();
  });

  it('updateForCreator updates only allowed fields (fullName and nickname)', async () => {
    const account = createMockAccount({
      id: 'a1',
      phoneNumber: '+1',
      fullName: 'John',
      nickname: 'Old Nickname',
      providerName: 'MPesa',
      providerCountry: 'Kenya',
      owner: {} as User,
      isVerified: false,
      verifiedAt: null,
    });
    accountRepo.findOne.mockResolvedValue(account);
    accountRepo.save.mockImplementation(async (a) => a as Account);

    const dto: UpdateAccountDto = {
      fullName: 'Jane',
      nickname: 'New Nickname',
    };
    const result = await service.updateForCreator('uid', 'a1', dto);
    expect(result.fullName).toBe('Jane');
    expect(result.nickname).toBe('New Nickname');
    expect(result.phoneNumber).toBe('+1'); // Should remain unchanged
    expect(result.providerName).toBe('MPesa'); // Should remain unchanged
    expect(accountRepo.save).toHaveBeenCalled();
  });

  it('updateForCreator allows updating only fullName', async () => {
    const account = createMockAccount({
      id: 'a1',
      phoneNumber: '+1',
      fullName: 'John',
      nickname: 'Existing Nickname',
      providerName: 'MPesa',
      providerCountry: 'Kenya',
      owner: {} as User,
      isVerified: false,
      verifiedAt: null,
    });
    accountRepo.findOne.mockResolvedValue(account);
    accountRepo.save.mockImplementation(async (a) => a as Account);

    const dto: UpdateAccountDto = {
      fullName: 'Jane',
    };
    const result = await service.updateForCreator('uid', 'a1', dto);
    expect(result.fullName).toBe('Jane');
    expect(result.nickname).toBe('Existing Nickname'); // Should remain unchanged
    expect(accountRepo.save).toHaveBeenCalled();
  });

  it('updateForCreator allows updating only nickname', async () => {
    const account = createMockAccount({
      id: 'a1',
      phoneNumber: '+1',
      fullName: 'John',
      nickname: 'Old Nickname',
      providerName: 'MPesa',
      providerCountry: 'Kenya',
      owner: {} as User,
      isVerified: false,
      verifiedAt: null,
    });
    accountRepo.findOne.mockResolvedValue(account);
    accountRepo.save.mockImplementation(async (a) => a as Account);

    const dto: UpdateAccountDto = {
      nickname: 'New Nickname',
    };
    const result = await service.updateForCreator('uid', 'a1', dto);
    expect(result.fullName).toBe('John'); // Should remain unchanged
    expect(result.nickname).toBe('New Nickname');
    expect(accountRepo.save).toHaveBeenCalled();
  });

  it('updateForCreator allows setting nickname to null', async () => {
    const account = createMockAccount({
      id: 'a1',
      phoneNumber: '+1',
      fullName: 'John',
      nickname: 'Old Nickname',
      providerName: 'MPesa',
      providerCountry: 'Kenya',
      owner: {} as User,
      isVerified: false,
      verifiedAt: null,
    });
    accountRepo.findOne.mockResolvedValue(account);
    accountRepo.save.mockImplementation(async (a) => a as Account);

    const dto: UpdateAccountDto = {
      nickname: null,
    };
    const result = await service.updateForCreator('uid', 'a1', dto);
    expect(result.nickname).toBe(null);
    expect(accountRepo.save).toHaveBeenCalled();
  });

  it('verifyAccount validates code and marks account verified', async () => {
    const account = createMockAccount({
      id: 'a1',
      owner: { firebaseUid: 'uid', id: 'u1' } as User,
      providerName: 'MPesa',
      providerCountry: 'Kenya',
      isVerified: false,
      verifiedAt: null,
    });
    accountRepo.findOne.mockResolvedValue(account);
    const verification: AccountVerification = {
      id: 'v1',
      account: account,
      code: '123456',
      createdAt: new Date(Date.now() - 60_000),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      sentAt: new Date(),
      verifiedAt: null,
      failedAttempts: 0,
      isDisabled: false,
    } as AccountVerification;
    verificationRepo.findOne.mockResolvedValue(verification);
    accountRepo.save.mockImplementation(async (acc) => acc as Account);
    verificationRepo.save.mockImplementation(
      async (v) => v as AccountVerification,
    );

    const dto: VerifyAccountDto = { code: '123456' };
    const result = await service.verifyAccount('uid', 'a1', dto);

    expect(result.isVerified).toBe(true);
    expect(accountRepo.save).toHaveBeenCalled();
    expect(verificationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ verifiedAt: expect.any(Date) }),
    );
  });

  it('verifyAccount throws error when no verification code found', async () => {
    const account = createMockAccount({
      id: 'a1',
      owner: { firebaseUid: 'uid', id: 'u1' } as User,
      providerName: 'MPesa',
      providerCountry: 'Kenya',
      isVerified: false,
      verifiedAt: null,
    });
    accountRepo.findOne.mockResolvedValue(account);
    verificationRepo.findOne.mockResolvedValue(null);

    const dto: VerifyAccountDto = { code: '123456' };

    await expect(service.verifyAccount('uid', 'a1', dto)).rejects.toThrow(
      'No verification code found. Please request a new verification code.',
    );
  });

  it('verifyAccount throws error when verification is disabled', async () => {
    const account = createMockAccount({
      id: 'a1',
      owner: { firebaseUid: 'uid', id: 'u1' } as User,
      providerName: 'MPesa',
      providerCountry: 'Kenya',
      isVerified: false,
      verifiedAt: null,
    });
    accountRepo.findOne.mockResolvedValue(account);
    const verification: AccountVerification = {
      id: 'v1',
      account: account,
      code: '123456',
      createdAt: new Date(Date.now() - 60_000),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      sentAt: new Date(),
      verifiedAt: null,
      failedAttempts: 3,
      isDisabled: true,
    } as AccountVerification;
    verificationRepo.findOne.mockResolvedValue(verification);

    const dto: VerifyAccountDto = { code: '123456' };

    await expect(service.verifyAccount('uid', 'a1', dto)).rejects.toThrow(
      'Too many failed attempts. Please request a new verification code.',
    );
  });

  it('verifyAccount throws error when code has expired', async () => {
    const account = createMockAccount({
      id: 'a1',
      owner: { firebaseUid: 'uid', id: 'u1' } as User,
      providerName: 'MPesa',
      providerCountry: 'Kenya',
      isVerified: false,
      verifiedAt: null,
    });
    accountRepo.findOne.mockResolvedValue(account);
    const verification: AccountVerification = {
      id: 'v1',
      account: account,
      code: '123456',
      createdAt: new Date(Date.now() - 60_000),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() - 60_000), // Expired
      sentAt: new Date(),
      verifiedAt: null,
      failedAttempts: 0,
      isDisabled: false,
    } as AccountVerification;
    verificationRepo.findOne.mockResolvedValue(verification);

    const dto: VerifyAccountDto = { code: '123456' };

    await expect(service.verifyAccount('uid', 'a1', dto)).rejects.toThrow(
      'Verification code has expired. Please request a new code.',
    );
  });

  it('verifyAccount increments failed attempts on wrong code', async () => {
    const account = createMockAccount({
      id: 'a1',
      owner: { firebaseUid: 'uid', id: 'u1' } as User,
      providerName: 'MPesa',
      providerCountry: 'Kenya',
      isVerified: false,
      verifiedAt: null,
    });
    accountRepo.findOne.mockResolvedValue(account);
    const verification: AccountVerification = {
      id: 'v1',
      account: account,
      code: '123456',
      createdAt: new Date(Date.now() - 60_000),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      sentAt: new Date(),
      verifiedAt: null,
      failedAttempts: 0,
      isDisabled: false,
    } as AccountVerification;
    verificationRepo.findOne.mockResolvedValue(verification);
    verificationRepo.save.mockImplementation(
      async (v) => v as AccountVerification,
    );

    const dto: VerifyAccountDto = { code: 'wrong' };

    await expect(service.verifyAccount('uid', 'a1', dto)).rejects.toThrow(
      'Invalid verification code. 2 attempts remaining.',
    );

    expect(verificationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ failedAttempts: 1 }),
    );
  });

  it('verifyAccount shows singular attempt remaining', async () => {
    const account = createMockAccount({
      id: 'a1',
      owner: { firebaseUid: 'uid', id: 'u1' } as User,
      providerName: 'MPesa',
      providerCountry: 'Kenya',
      isVerified: false,
      verifiedAt: null,
    });
    accountRepo.findOne.mockResolvedValue(account);
    const verification: AccountVerification = {
      id: 'v1',
      account: account,
      code: '123456',
      createdAt: new Date(Date.now() - 60_000),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      sentAt: new Date(),
      verifiedAt: null,
      failedAttempts: 1,
      isDisabled: false,
    } as AccountVerification;
    verificationRepo.findOne.mockResolvedValue(verification);
    verificationRepo.save.mockImplementation(
      async (v) => v as AccountVerification,
    );

    const dto: VerifyAccountDto = { code: 'wrong' };

    await expect(service.verifyAccount('uid', 'a1', dto)).rejects.toThrow(
      'Invalid verification code. 1 attempt remaining.',
    );

    expect(verificationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ failedAttempts: 2 }),
    );
  });

  it('verifyAccount disables verification after 3 failed attempts', async () => {
    const account = createMockAccount({
      id: 'a1',
      owner: { firebaseUid: 'uid', id: 'u1' } as User,
      providerName: 'MPesa',
      providerCountry: 'Kenya',
      isVerified: false,
      verifiedAt: null,
    });
    accountRepo.findOne.mockResolvedValue(account);
    const verification: AccountVerification = {
      id: 'v1',
      account: account,
      code: '123456',
      createdAt: new Date(Date.now() - 60_000),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      sentAt: new Date(),
      verifiedAt: null,
      failedAttempts: 2,
      isDisabled: false,
    } as AccountVerification;
    verificationRepo.findOne.mockResolvedValue(verification);
    verificationRepo.save.mockImplementation(
      async (v) => v as AccountVerification,
    );

    const dto: VerifyAccountDto = { code: 'wrong' };

    await expect(service.verifyAccount('uid', 'a1', dto)).rejects.toThrow(
      'Invalid verification code. Too many failed attempts. Please request a new verification code.',
    );

    expect(verificationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        failedAttempts: 3,
        isDisabled: true,
      }),
    );
  });

  it('verifyAccount returns account if already verified', async () => {
    const account = createMockAccount({
      id: 'a1',
      owner: { firebaseUid: 'uid', id: 'u1' } as User,
      providerName: 'MPesa',
      providerCountry: 'Kenya',
      isVerified: true,
      verifiedAt: new Date(),
    });
    accountRepo.findOne.mockResolvedValue(account);

    const dto: VerifyAccountDto = { code: '123456' };
    const result = await service.verifyAccount('uid', 'a1', dto);

    expect(result.isVerified).toBe(true);
    expect(verificationRepo.findOne).not.toHaveBeenCalled();
  });

  it('resendVerification returns already verified response for verified accounts', async () => {
    const account = createMockAccount({
      id: 'a1',
      owner: { firebaseUid: 'uid', id: 'u1' } as User,
      providerName: 'MPesa',
      providerCountry: 'Kenya',
      isVerified: true,
      verifiedAt: new Date(),
      phoneNumber: '+111',
    });
    accountRepo.findOne.mockResolvedValue(account);

    const result = await service.resendVerification('uid', 'a1');

    expect(result).toEqual({
      alreadyVerified: true,
      message: 'Account is already verified',
      codeSent: false,
    } as ResendVerificationResponseDto);
    expect(verificationRepo.findOne).not.toHaveBeenCalled();
    expect(infobipService.sendSms).not.toHaveBeenCalled();
  });

  it('resendVerification enforces cooldown window', async () => {
    const account = createMockAccount({
      id: 'a1',
      owner: { firebaseUid: 'uid', id: 'u1' } as User,
      providerName: 'MPesa',
      providerCountry: 'Kenya',
      isVerified: false,
      verifiedAt: null,
      phoneNumber: '+111',
    });
    accountRepo.findOne.mockResolvedValue(account);
    verificationRepo.findOne.mockResolvedValue({
      id: 'v1',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 300_000),
      code: '123456',
      account,
      updatedAt: new Date(),
      sentAt: new Date(),
      verifiedAt: null,
    } as AccountVerification);

    await expect(service.resendVerification('uid', 'a1')).rejects.toThrow(
      /Please wait/,
    );
  });

  it('resendVerification sends new code when cooldown has elapsed', async () => {
    const account = createMockAccount({
      id: 'a1',
      owner: { firebaseUid: 'uid', id: 'u1' } as User,
      providerName: 'MPesa',
      providerCountry: 'Kenya',
      isVerified: false,
      verifiedAt: null,
      phoneNumber: '+111',
    });
    accountRepo.findOne.mockResolvedValue(account);
    verificationRepo.findOne.mockResolvedValue({
      id: 'v1',
      createdAt: new Date(Date.now() - 25_000), // 25 seconds ago, past cooldown
      expiresAt: new Date(Date.now() + 300_000),
      code: '123456',
      account,
      updatedAt: new Date(),
      sentAt: new Date(),
      verifiedAt: null,
    } as AccountVerification);
    verificationRepo.create.mockImplementation(
      (input) => input as AccountVerification,
    );
    verificationRepo.save.mockImplementation(async (input) => ({
      ...(input as AccountVerification),
      id: 'v2',
      createdAt: new Date(),
    }));
    infobipService.sendSms.mockResolvedValue({});

    const result = await service.resendVerification('uid', 'a1');

    expect(result).toEqual({
      alreadyVerified: false,
      message: 'Verification code sent successfully',
      codeSent: true,
    } as ResendVerificationResponseDto);
    expect(verificationRepo.save).toHaveBeenCalled();
    expect(infobipService.sendSms).toHaveBeenCalledWith(
      expect.objectContaining({ to: '+111' }),
    );
  });

  describe('softDelete', () => {
    it('should call softDelete on the repository for the given account', async () => {
      const accountId = 'some-uuid';
      const firebaseUid = 'some-firebase-uid';
      const account = createMockAccount({ id: accountId });

      accountRepo.findOne.mockResolvedValue(account);
      accountRepo.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.softDelete(firebaseUid, accountId);

      expect(accountRepo.findOne).toHaveBeenCalledWith({
        where: { id: accountId, owner: { firebaseUid } },
        relations: ['owner'],
      });
      expect(accountRepo.softDelete).toHaveBeenCalledWith(accountId);
    });

    it('should throw NotFoundException if the account does not exist', async () => {
      const accountId = 'non-existent-uuid';
      const firebaseUid = 'some-firebase-uid';

      accountRepo.findOne.mockResolvedValue(null);

      await expect(service.softDelete(firebaseUid, accountId)).rejects.toThrow(
        'Account not found',
      );
    });
  });

  describe('createForCreator - deleted account scenarios', () => {
    it('should restore deleted account for same owner', async () => {
      const owner = { id: 'u1', firebaseUid: 'uid' } as User;
      const provider = createMockProvider({ name: 'MPesa', country: 'Kenya' });

      userRepo.findOne.mockResolvedValue(owner);
      providerCacheService.validateProvider.mockResolvedValue(provider);

      // Existing soft-deleted account owned by same creator
      const deletedAccount = createMockAccount({
        id: 'a1',
        phoneNumber: '+1',
        fullName: 'Old Name',
        nickname: 'Old Nickname',
        owner,
        providerName: 'MPesa',
        providerCountry: 'Kenya',
        isVerified: true,
        verifiedAt: new Date(),
        deletedAt: new Date(), // Soft deleted
      });

      accountRepo.findOne.mockResolvedValue(deletedAccount);
      verificationRepo.update.mockResolvedValue({ affected: 1 } as any);
      accountRepo.save.mockImplementation(
        async (account) => account as Account,
      );
      verificationRepo.create.mockImplementation(
        (input) => input as AccountVerification,
      );
      verificationRepo.save.mockImplementation(async (input) => ({
        ...(input as AccountVerification),
        id: 'v1',
        createdAt: new Date(),
      }));
      infobipService.sendSms.mockResolvedValue({});

      const dto: CreateAccountDto = {
        phoneNumber: '+1',
        fullName: 'New Name',
        nickname: 'New Nickname',
        providerName: 'MPesa',
        countryCode: 'KEN',
      };

      const result = await service.createForCreator('uid', dto);

      expect(result.account.fullName).toBe('New Name');
      expect(result.account.nickname).toBe('New Nickname');
      expect(result.account.isVerified).toBe(false); // Reset verification
      expect(verificationRepo.update).toHaveBeenCalledWith(
        { account: { id: 'a1' } },
        { isDisabled: true },
      );
      expect(accountRepo.save).toHaveBeenCalled();
      expect(infobipService.sendSms).toHaveBeenCalled();
    });

    it('should preserve existing metadata when restoring deleted account if not provided in DTO', async () => {
      const owner = { id: 'u1', firebaseUid: 'uid' } as User;
      const provider = createMockProvider({ name: 'MPesa', country: 'Kenya' });

      userRepo.findOne.mockResolvedValue(owner);
      providerCacheService.validateProvider.mockResolvedValue(provider);

      // Existing soft-deleted account with existing metadata
      const deletedAccount = createMockAccount({
        id: 'a1',
        phoneNumber: '+1',
        fullName: 'Existing Name',
        nickname: 'Existing Nickname',
        owner,
        providerName: 'MPesa',
        providerCountry: 'Kenya',
        isVerified: true,
        verifiedAt: new Date(),
        deletedAt: new Date(),
      });

      accountRepo.findOne.mockResolvedValue(deletedAccount);
      verificationRepo.update.mockResolvedValue({ affected: 1 } as any);
      accountRepo.save.mockImplementation(
        async (account) => account as Account,
      );
      verificationRepo.create.mockImplementation(
        (input) => input as AccountVerification,
      );
      verificationRepo.save.mockImplementation(async (input) => ({
        ...(input as AccountVerification),
        id: 'v1',
        createdAt: new Date(),
      }));
      infobipService.sendSms.mockResolvedValue({});

      const dto: CreateAccountDto = {
        phoneNumber: '+1',
        fullName: 'Existing Name', // Will be ignored since we preserve existing
        providerName: 'MPesa',
        countryCode: 'KEN',
        // No nickname provided
      };

      const result = await service.createForCreator('uid', dto);

      expect(result.account.fullName).toBe('Existing Name'); // Preserved
      expect(result.account.nickname).toBe('Existing Nickname'); // Preserved
      expect(result.account.isVerified).toBe(false); // Reset verification
    });

    it('should anonymize deleted account and create new one for different owner', async () => {
      const newOwner = { id: 'u2', firebaseUid: 'uid2' } as User;
      const oldOwner = { id: 'u1', firebaseUid: 'uid1' } as User;
      const provider = createMockProvider({ name: 'MPesa', country: 'Kenya' });

      userRepo.findOne.mockResolvedValue(newOwner);
      providerCacheService.validateProvider.mockResolvedValue(provider);

      // Existing soft-deleted account owned by different creator
      const deletedAccount = createMockAccount({
        id: 'a1',
        phoneNumber: '+256701234567',
        fullName: 'Old Owner',
        nickname: 'Old Nickname',
        owner: oldOwner,
        providerName: 'MPesa',
        providerCountry: 'Kenya',
        isVerified: true,
        verifiedAt: new Date(),
        deletedAt: new Date(),
      });

      accountRepo.findOne.mockResolvedValue(deletedAccount);
      accountRepo.save.mockImplementation(
        async (account) => account as Account,
      );
      accountRepo.create.mockReturnValue({ owner: newOwner } as Account);
      accountRepo.save.mockResolvedValueOnce(deletedAccount); // For anonymizing old account
      accountRepo.save.mockResolvedValueOnce(
        createMockAccount({
          id: 'a2',
          phoneNumber: '+256701234567',
          fullName: 'New Owner',
          nickname: 'New Nickname',
          providerName: 'MPesa',
          providerCountry: 'Kenya',
          owner: newOwner,
          isVerified: false,
          verifiedAt: null,
        }),
      ); // For saving new account
      verificationRepo.create.mockImplementation(
        (input) => input as AccountVerification,
      );
      verificationRepo.save.mockImplementation(async (input) => ({
        ...(input as AccountVerification),
        id: 'v1',
        createdAt: new Date(),
      }));
      infobipService.sendSms.mockResolvedValue({});

      const dto: CreateAccountDto = {
        phoneNumber: '+256701234567',
        fullName: 'New Owner',
        nickname: 'New Nickname',
        providerName: 'MPesa',
        countryCode: 'KEN',
      };

      const result = await service.createForCreator('uid2', dto);

      // Verify old account was anonymized with hash-based approach
      expect(accountRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          phoneNumber: expect.stringMatching(/^ANON_[a-f0-9]{16}$/), // Hash-based anonymization
        }),
      );

      // Verify new account was created with denormalized provider fields
      expect(accountRepo.create).toHaveBeenCalledWith({
        owner: newOwner,
        providerName: provider.name,
        providerCountry: provider.country,
        providerCountryCode: provider.countryCode,
        currencyCode: provider.currency,
        phoneNumber: '+256701234567', // Original phone number
        fullName: 'New Owner',
        nickname: 'New Nickname',
        isVerified: false,
        verifiedAt: null,
      });

      expect(result.account.fullName).toBe('New Owner');
      expect(infobipService.sendSms).toHaveBeenCalled();
    });

    it('should accept phone numbers with some 9s but not all', async () => {
      const owner = { id: 'u1', firebaseUid: 'uid' } as User;
      const provider = createMockProvider({ name: 'MPesa', country: 'Kenya' });

      userRepo.findOne.mockResolvedValue(owner);
      providerCacheService.validateProvider.mockResolvedValue(provider);
      accountRepo.findOne.mockResolvedValue(null); // No existing account
      accountRepo.create.mockReturnValue({ owner } as Account);
      accountRepo.save.mockResolvedValue(
        createMockAccount({
          id: 'a1',
          phoneNumber: '+256701234999',
          fullName: 'Test User',
          providerName: 'MPesa',
          providerCountry: 'Kenya',
          owner,
          isVerified: false,
          verifiedAt: null,
        }),
      );
      verificationRepo.create.mockImplementation(
        (input) => input as AccountVerification,
      );
      verificationRepo.save.mockImplementation(async (input) => ({
        ...(input as AccountVerification),
        id: 'v1',
        createdAt: new Date(),
      }));
      infobipService.sendSms.mockResolvedValue({});

      const dto: CreateAccountDto = {
        phoneNumber: '+256701234999', // Has 9s but not all digits are 9
        fullName: 'Test User',
        providerName: 'MPesa',
        countryCode: 'KEN',
      };

      const result = await service.createForCreator('uid', dto);

      expect(result.account.phoneNumber).toBe('+256701234999');
      expect(result.account.fullName).toBe('Test User');
      expect(userRepo.findOne).toHaveBeenCalled();
    });
  });
});
