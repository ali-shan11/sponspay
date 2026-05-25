import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomInt, createHash } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, DataSource } from 'typeorm';
import { Account } from './entities/account.entity';
import { User } from '../creator/entities/user.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountDto } from './dto/account.dto';
import { CreateAccountResponseDto } from './dto/create-account-response.dto';
import { ProviderCountryDto } from './dto/provider-country.dto';
import { AccountVerification } from './entities/account-verification.entity';
import { InfobipService } from '../infobip/infobip.service';
import { VerifyAccountDto } from './dto/verify-account.dto';
import { ResendVerificationResponseDto } from './dto/resend-verification-response.dto';
import { AccountsConfig } from './config/accounts.config';
import {
  VerificationExpiredException,
  TooManyAttemptsException,
  AccountTakeoverException,
  VerificationNotFoundException,
  InvalidVerificationCodeException,
} from './exceptions/accounts.exceptions';
import { sanitizeFullName, sanitizeNickname } from './utils/sanitization.util';
import { AuditLogService } from './services/audit-log.service';
import { getCurrentRequestContext } from './middleware/request-context.middleware';
import { ProviderCacheService } from '../pawapay/provider-cache.service';
import { Provider } from '../pawapay/interfaces/provider.interface';

const VERIFICATION_MESSAGE_TEMPLATE =
  'Your SponsPay verification code is {{code}}. It expires in 5 minutes.';

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    private readonly providerCacheService: ProviderCacheService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AccountVerification)
    private readonly verificationRepo: Repository<AccountVerification>,
    private readonly infobipService: InfobipService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly accountsConfig: AccountsConfig,
    private readonly auditLogService: AuditLogService,
  ) {}

  private toDto(entity: Account): AccountDto {
    return {
      id: entity.id,
      phoneNumber: entity.phoneNumber,
      fullName: entity.fullName,
      nickname: entity.nickname || null,
      providerName: entity.providerName,
      country: entity.providerCountry,
      isVerified: entity.isVerified,
      verifiedAt: entity.verifiedAt || null,
    };
  }

  private generateCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  private buildVerificationMessage(code: string): string {
    return VERIFICATION_MESSAGE_TEMPLATE.replace('{{code}}', code);
  }

  private anonymizePhoneNumber(phoneNumber: string): string {
    const salt = this.configService.get<string>('ANONYMIZATION_SALT');
    const hash = createHash('sha256')
      .update(phoneNumber + salt)
      .digest('hex');
    return `ANON_${hash.substring(0, 16)}`;
  }

  private getAuditContext(firebaseUid?: string) {
    const requestContext = getCurrentRequestContext();
    return {
      firebaseUid: firebaseUid || requestContext?.firebaseUid,
      ipAddress: requestContext?.ipAddress,
      userAgent: requestContext?.userAgent,
    };
  }

  private async loadCreatorAccount(
    firebaseUid: string,
    accountId: string,
  ): Promise<Account> {
    const account = await this.accountRepo.findOne({
      where: { id: accountId, owner: { firebaseUid } },
      relations: ['owner'],
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    return account;
  }

  private async issueVerification(account: Account): Promise<void> {
    const code = this.generateCode();
    const verification = this.verificationRepo.create({
      account: { id: account.id } as Account,
      code,
      expiresAt: new Date(Date.now() + this.accountsConfig.codeValidityMs),
      sentAt: null,
      verifiedAt: null,
    });

    const savedVerification = await this.verificationRepo.save(verification);

    try {
      await this.infobipService.sendSms({
        to: account.phoneNumber,
        text: this.buildVerificationMessage(code),
        userId: account.owner?.id,
        accountId: account.id,
        verificationId: savedVerification.id,
      });

      savedVerification.sentAt = new Date();
      await this.verificationRepo.save(savedVerification);
    } catch (error) {
      await this.verificationRepo.remove(savedVerification);
      this.logger.error(
        `Failed to send verification SMS for account ${account.id}: ${
          (error as Error)?.message || error
        }`,
      );
      throw new InternalServerErrorException('Failed to send verification SMS');
    }
  }

  private async takeoverUnverifiedAccount(
    existingAccount: Account,
    newOwner: User,
    newProvider: Provider,
    dto: CreateAccountDto,
  ): Promise<AccountDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Invalidate all existing verifications for this account
      await queryRunner.manager
        .getRepository(AccountVerification)
        .update({ account: { id: existingAccount.id } }, { isDisabled: true });

      // Update account with new owner and provider details
      existingAccount.owner = newOwner;
      existingAccount.providerName = newProvider.name;
      existingAccount.providerCountry = newProvider.country;
      existingAccount.providerCountryCode = newProvider.countryCode;
      existingAccount.currencyCode = newProvider.currency;
      existingAccount.fullName = dto.fullName;
      existingAccount.nickname = dto.nickname || null;
      existingAccount.isVerified = false;
      existingAccount.verifiedAt = null;

      const savedAccount = await queryRunner.manager
        .getRepository(Account)
        .save(existingAccount);

      // Create verification record within transaction
      const code = this.generateCode();
      const verification = queryRunner.manager
        .getRepository(AccountVerification)
        .create({
          account: { id: savedAccount.id } as Account,
          code,
          expiresAt: new Date(Date.now() + this.accountsConfig.codeValidityMs),
          sentAt: null,
          verifiedAt: null,
        });

      const savedVerification = await queryRunner.manager
        .getRepository(AccountVerification)
        .save(verification);

      await queryRunner.commitTransaction();

      // Log account takeover
      await this.auditLogService.logAccountTakeover(
        savedAccount.id,
        savedAccount.phoneNumber,
        existingAccount.owner.firebaseUid,
        newOwner.firebaseUid,
        this.getAuditContext(newOwner.firebaseUid),
      );

      // Send SMS after transaction commit
      try {
        await this.infobipService.sendSms({
          to: savedAccount.phoneNumber,
          text: this.buildVerificationMessage(code),
          userId: savedAccount.owner?.id,
          accountId: savedAccount.id,
          verificationId: savedVerification.id,
        });

        // Update sentAt timestamp after successful SMS
        savedVerification.sentAt = new Date();
        await this.verificationRepo.save(savedVerification);

        // Log verification SMS sent
        await this.auditLogService.logVerificationSent(
          savedAccount.id,
          savedAccount.phoneNumber,
          savedVerification.id,
          this.getAuditContext(newOwner.firebaseUid),
        );
      } catch (error) {
        this.logger.error(
          `Failed to send verification SMS during account takeover for account ${savedAccount.id}: ${
            (error as Error)?.message || error
          }`,
        );
        throw new InternalServerErrorException(
          'Failed to send verification SMS',
        );
      }

      return this.toDto(savedAccount);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to takeover unverified account ${existingAccount.id}: ${
          (error as Error)?.message || error
        }`,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async restoreDeletedAccount(
    existingAccount: Account,
    owner: User,
    provider: Provider,
    dto: CreateAccountDto,
  ): Promise<AccountDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Invalidate all existing verifications for this account
      await queryRunner.manager
        .getRepository(AccountVerification)
        .update({ account: { id: existingAccount.id } }, { isDisabled: true });

      // Restore the account by clearing deletedAt and updating provider info
      existingAccount.deletedAt = undefined;
      existingAccount.providerName = provider.name;
      existingAccount.providerCountry = provider.country;
      existingAccount.providerCountryCode = provider.countryCode;
      existingAccount.currencyCode = provider.currency;
      existingAccount.isVerified = false;
      existingAccount.verifiedAt = null;

      // Preserve existing metadata (nickname, fullName) but allow updates if provided
      if (dto.fullName) {
        existingAccount.fullName = dto.fullName;
      }
      if (dto.nickname !== undefined) {
        existingAccount.nickname = dto.nickname;
      }

      const savedAccount = await queryRunner.manager
        .getRepository(Account)
        .save(existingAccount);

      // Create verification record within transaction
      const code = this.generateCode();
      const verification = queryRunner.manager
        .getRepository(AccountVerification)
        .create({
          account: { id: savedAccount.id } as Account,
          code,
          expiresAt: new Date(Date.now() + this.accountsConfig.codeValidityMs),
          sentAt: null,
          verifiedAt: null,
        });

      const savedVerification = await queryRunner.manager
        .getRepository(AccountVerification)
        .save(verification);

      await queryRunner.commitTransaction();

      // Log account restoration
      await this.auditLogService.logAccountRestored(
        savedAccount.id,
        savedAccount.phoneNumber,
        this.getAuditContext(owner.firebaseUid),
      );

      // Send SMS after transaction commit
      try {
        await this.infobipService.sendSms({
          to: savedAccount.phoneNumber,
          text: this.buildVerificationMessage(code),
          userId: savedAccount.owner?.id,
          accountId: savedAccount.id,
          verificationId: savedVerification.id,
        });

        // Update sentAt timestamp after successful SMS
        savedVerification.sentAt = new Date();
        await this.verificationRepo.save(savedVerification);

        // Log verification SMS sent
        await this.auditLogService.logVerificationSent(
          savedAccount.id,
          savedAccount.phoneNumber,
          savedVerification.id,
          this.getAuditContext(owner.firebaseUid),
        );
      } catch (error) {
        this.logger.error(
          `Failed to send verification SMS during account restoration for account ${savedAccount.id}: ${
            (error as Error)?.message || error
          }`,
        );
        throw new InternalServerErrorException(
          'Failed to send verification SMS',
        );
      }

      return this.toDto(savedAccount);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to restore deleted account ${existingAccount.id}: ${
          (error as Error)?.message || error
        }`,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async anonymizeAndCreateNew(
    existingAccount: Account,
    newOwner: User,
    newProvider: Provider,
    dto: CreateAccountDto,
  ): Promise<AccountDto> {
    // Sanitize input data
    const sanitizedFullName = sanitizeFullName(dto.fullName);
    const sanitizedNickname = sanitizeNickname(dto.nickname);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Anonymize the old account's phone number
      const anonymizedPhoneNumber = this.anonymizePhoneNumber(
        existingAccount.phoneNumber,
      );
      existingAccount.phoneNumber = anonymizedPhoneNumber;

      // Save the anonymized old account
      await queryRunner.manager.getRepository(Account).save(existingAccount);

      this.logger.log(
        `Account ${existingAccount.id} anonymized with phone number ${anonymizedPhoneNumber}, new account created for phone ${dto.phoneNumber}`,
      );

      // Create a completely new account with the original phone number
      const newAccount = queryRunner.manager.getRepository(Account).create({
        owner: newOwner,
        providerName: newProvider.name,
        providerCountry: newProvider.country,
        providerCountryCode: newProvider.countryCode,
        currencyCode: newProvider.currency,
        phoneNumber: dto.phoneNumber,
        fullName: sanitizedFullName,
        nickname: sanitizedNickname,
        isVerified: false,
        verifiedAt: null,
      });

      const savedAccount = await queryRunner.manager
        .getRepository(Account)
        .save(newAccount);

      // Create verification record within transaction
      const code = this.generateCode();
      const verification = queryRunner.manager
        .getRepository(AccountVerification)
        .create({
          account: { id: savedAccount.id } as Account,
          code,
          expiresAt: new Date(Date.now() + this.accountsConfig.codeValidityMs),
          sentAt: null,
          verifiedAt: null,
        });

      const savedVerification = await queryRunner.manager
        .getRepository(AccountVerification)
        .save(verification);

      await queryRunner.commitTransaction();

      // Log account anonymization
      await this.auditLogService.logAccountAnonymized(
        existingAccount.id,
        dto.phoneNumber,
        anonymizedPhoneNumber,
        this.getAuditContext(newOwner.firebaseUid),
      );

      // Log new account creation
      await this.auditLogService.logAccountCreated(
        savedAccount.id,
        savedAccount.phoneNumber,
        newProvider.name,
        this.getAuditContext(newOwner.firebaseUid),
      );

      // Send SMS after transaction commit
      try {
        await this.infobipService.sendSms({
          to: savedAccount.phoneNumber,
          text: this.buildVerificationMessage(code),
          userId: savedAccount.owner?.id,
          accountId: savedAccount.id,
          verificationId: savedVerification.id,
        });

        // Update sentAt timestamp after successful SMS
        savedVerification.sentAt = new Date();
        await this.verificationRepo.save(savedVerification);

        // Log verification SMS sent
        await this.auditLogService.logVerificationSent(
          savedAccount.id,
          savedAccount.phoneNumber,
          savedVerification.id,
          this.getAuditContext(newOwner.firebaseUid),
        );
      } catch (error) {
        this.logger.error(
          `Failed to send verification SMS for new account ${savedAccount.id}: ${
            (error as Error)?.message || error
          }`,
        );
        throw new InternalServerErrorException(
          'Failed to send verification SMS',
        );
      }

      return this.toDto(savedAccount);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to anonymize and create new account: ${
          (error as Error)?.message || error
        }`,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async listProviderCountries(): Promise<ProviderCountryDto[]> {
    const providers = await this.providerCacheService.getProviders();

    const uniqueCountries = new Map<string, ProviderCountryDto>();
    for (const provider of providers) {
      if (provider.country && provider.countryCode) {
        const key = `${provider.country}|${provider.countryCode}`;
        if (!uniqueCountries.has(key)) {
          uniqueCountries.set(key, {
            country: provider.country,
            countryCode: provider.countryCode,
          });
        }
      }
    }

    return Array.from(uniqueCountries.values()).sort((a, b) => {
      const countryCompare = a.country.localeCompare(b.country);
      if (countryCompare !== 0) {
        return countryCompare;
      }
      return a.countryCode.localeCompare(b.countryCode);
    });
  }

  async findAllForCreator(firebaseUid: string): Promise<AccountDto[]> {
    const accounts = await this.accountRepo.find({
      where: {
        owner: { firebaseUid },
        isVerified: true,
      },
      withDeleted: false,
    });
    return accounts.map((a) => this.toDto(a));
  }

  async createForCreator(
    firebaseUid: string,
    dto: CreateAccountDto,
  ): Promise<CreateAccountResponseDto> {
    // Sanitize input data
    const sanitizedFullName = sanitizeFullName(dto.fullName);
    const sanitizedNickname = sanitizeNickname(dto.nickname);

    const owner = await this.userRepo.findOne({ where: { firebaseUid } });
    if (!owner) {
      throw new NotFoundException('Creator not found');
    }

    // Validate provider exists via PawaPay API
    const provider = await this.providerCacheService.validateProvider(
      dto.providerName,
      dto.countryCode,
    );
    if (!provider) {
      throw new NotFoundException(
        `Payment provider ${dto.providerName} not found in ${dto.countryCode}`,
      );
    }

    // Check for existing account with the same phone number (including soft-deleted)
    const existingAccount = await this.accountRepo.findOne({
      where: { phoneNumber: dto.phoneNumber },
      relations: ['owner'],
      withDeleted: true,
    });

    if (existingAccount) {
      // Handle soft-deleted accounts
      if (existingAccount.deletedAt) {
        if (existingAccount.owner.firebaseUid === firebaseUid) {
          // Same owner restoring deleted account
          this.logger.log(
            `Account restored for user ${firebaseUid}, account ${existingAccount.id}`,
          );
          const accountDto = await this.restoreDeletedAccount(
            existingAccount,
            owner,
            provider,
            dto,
          );
          return {
            account: accountDto,
          };
        } else {
          // Different owner, anonymize old account and create new
          this.logger.log(
            `Account ${existingAccount.id} anonymized, creating new account for phone ${dto.phoneNumber}`,
          );
          const accountDto = await this.anonymizeAndCreateNew(
            existingAccount,
            owner,
            provider,
            dto,
          );
          return {
            account: accountDto,
          };
        }
      }

      if (!existingAccount.isVerified) {
        // Unverified account - allow takeover by any creator
        this.logger.log(
          `Account takeover: phone ${dto.phoneNumber} from owner ${existingAccount.owner.firebaseUid} to ${firebaseUid}`,
        );
        const accountDto = await this.takeoverUnverifiedAccount(
          existingAccount,
          owner,
          provider,
          dto,
        );
        return {
          account: accountDto,
        };
      }

      // Account is verified
      if (existingAccount.owner.firebaseUid === firebaseUid) {
        // Same creator trying to add verified account again
        this.logger.log(
          `Creator ${firebaseUid} attempted to re-add verified account ${existingAccount.id}`,
        );
        return {
          account: this.toDto(existingAccount),
          message: 'This account is already added to your profile.',
          alreadyExists: true,
        };
      }

      // Different creator trying to add verified account
      this.logger.warn(
        `Creator ${firebaseUid} attempted to claim verified account ${existingAccount.id} owned by ${existingAccount.owner.firebaseUid}`,
      );
      throw new AccountTakeoverException();
    }

    // No existing account - create new one with transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const account = queryRunner.manager.getRepository(Account).create({
        owner,
        providerName: provider.name,
        providerCountry: provider.country,
        providerCountryCode: provider.countryCode,
        currencyCode: provider.currency,
        phoneNumber: dto.phoneNumber,
        fullName: sanitizedFullName,
        nickname: sanitizedNickname,
        isVerified: false,
        verifiedAt: null,
      });

      const saved = await queryRunner.manager
        .getRepository(Account)
        .save(account);

      // Create verification record within transaction
      const code = this.generateCode();
      const verification = queryRunner.manager
        .getRepository(AccountVerification)
        .create({
          account: { id: saved.id } as Account,
          code,
          expiresAt: new Date(Date.now() + this.accountsConfig.codeValidityMs),
          sentAt: null,
          verifiedAt: null,
        });

      const savedVerification = await queryRunner.manager
        .getRepository(AccountVerification)
        .save(verification);

      await queryRunner.commitTransaction();

      // Log account creation
      await this.auditLogService.logAccountCreated(
        saved.id,
        saved.phoneNumber,
        provider.name,
        this.getAuditContext(firebaseUid),
      );

      // Send SMS after transaction commit
      try {
        await this.infobipService.sendSms({
          to: saved.phoneNumber,
          text: this.buildVerificationMessage(code),
          userId: saved.owner?.id,
          accountId: saved.id,
          verificationId: savedVerification.id,
        });

        // Update sentAt timestamp after successful SMS
        savedVerification.sentAt = new Date();
        await this.verificationRepo.save(savedVerification);

        // Log verification SMS sent
        await this.auditLogService.logVerificationSent(
          saved.id,
          saved.phoneNumber,
          savedVerification.id,
          this.getAuditContext(firebaseUid),
        );
      } catch (error) {
        this.logger.error(
          `Failed to send verification SMS for new account ${saved.id}: ${
            (error as Error)?.message || error
          }`,
        );
        throw new InternalServerErrorException(
          'Failed to send verification SMS',
        );
      }

      return {
        account: this.toDto(saved),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to create new account: ${(error as Error)?.message || error}`,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async softDelete(firebaseUid: string, id: string): Promise<void> {
    const account = await this.loadCreatorAccount(firebaseUid, id);
    await this.accountRepo.softDelete(account.id);

    // Log account deletion
    await this.auditLogService.logAccountDeleted(
      account.id,
      account.phoneNumber,
      this.getAuditContext(firebaseUid),
    );
  }

  async updateForCreator(
    firebaseUid: string,
    id: string,
    dto: UpdateAccountDto,
  ): Promise<AccountDto> {
    const account = await this.loadCreatorAccount(firebaseUid, id);

    // Track changes for audit logging
    const changes: Record<string, { from: any; to: any }> = {};

    if (dto.fullName !== undefined && dto.fullName !== account.fullName) {
      changes.fullName = { from: account.fullName, to: dto.fullName };
      account.fullName = sanitizeFullName(dto.fullName);
    }
    if (dto.nickname !== undefined && dto.nickname !== account.nickname) {
      changes.nickname = { from: account.nickname, to: dto.nickname };
      account.nickname = sanitizeNickname(dto.nickname);
    }

    const saved = await this.accountRepo.save(account);

    // Log account update if there were changes
    if (Object.keys(changes).length > 0) {
      await this.auditLogService.logAccountUpdated(
        account.id,
        changes,
        this.getAuditContext(firebaseUid),
      );
    }

    return this.toDto(saved);
  }

  async verifyAccount(
    firebaseUid: string,
    id: string,
    dto: VerifyAccountDto,
  ): Promise<AccountDto> {
    const account = await this.loadCreatorAccount(firebaseUid, id);
    if (account.isVerified) {
      return this.toDto(account);
    }

    const latestVerification = await this.verificationRepo.findOne({
      where: { account: { id: account.id } },
      order: { createdAt: 'DESC' },
    });

    if (!latestVerification) {
      throw new VerificationNotFoundException();
    }

    // Check if verification is disabled due to too many failed attempts
    if (latestVerification.isDisabled) {
      throw new TooManyAttemptsException();
    }

    // Check if code has expired
    if (latestVerification.expiresAt.getTime() < Date.now()) {
      throw new VerificationExpiredException();
    }

    // Check if code matches
    if (latestVerification.code !== dto.code) {
      // Increment failed attempts - use transaction for consistency
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        latestVerification.failedAttempts += 1;

        // Disable verification if max failed attempts reached
        if (
          latestVerification.failedAttempts >=
          this.accountsConfig.maxFailedAttempts
        ) {
          latestVerification.isDisabled = true;
        }

        await queryRunner.manager
          .getRepository(AccountVerification)
          .save(latestVerification);

        await queryRunner.commitTransaction();

        // Log failed verification attempt
        await this.auditLogService.logVerificationAttempted(
          account.id,
          account.phoneNumber,
          false,
          this.accountsConfig.maxFailedAttempts -
            latestVerification.failedAttempts,
          this.getAuditContext(firebaseUid),
        );

        const remainingAttempts =
          this.accountsConfig.maxFailedAttempts -
          latestVerification.failedAttempts;
        throw new InvalidVerificationCodeException(remainingAttempts);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    }

    // Code is valid - mark as verified using transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      latestVerification.verifiedAt = new Date();
      account.isVerified = true;
      account.verifiedAt = latestVerification.verifiedAt;

      await queryRunner.manager.getRepository(Account).save(account);
      await queryRunner.manager
        .getRepository(AccountVerification)
        .save(latestVerification);

      await queryRunner.commitTransaction();

      // Log successful verification
      await this.auditLogService.logVerificationAttempted(
        account.id,
        account.phoneNumber,
        true,
        undefined,
        this.getAuditContext(firebaseUid),
      );

      return this.toDto(account);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to verify account ${account.id}: ${
          (error as Error)?.message || error
        }`,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async resendVerification(
    firebaseUid: string,
    id: string,
  ): Promise<ResendVerificationResponseDto> {
    const account = await this.loadCreatorAccount(firebaseUid, id);

    if (account.isVerified) {
      return {
        alreadyVerified: true,
        message: 'Account is already verified',
        codeSent: false,
      };
    }

    const latestVerification = await this.verificationRepo.findOne({
      where: { account: { id: account.id } },
      order: { createdAt: 'DESC' },
    });

    if (latestVerification) {
      const age = Date.now() - latestVerification.createdAt.getTime();
      if (age < this.accountsConfig.resendCooldownMs) {
        throw new BadRequestException(
          'Please wait a few seconds before requesting a new code',
        );
      }
    }

    await this.issueVerification(account);

    // Log verification resent
    const newVerification = await this.verificationRepo.findOne({
      where: { account: { id: account.id } },
      order: { createdAt: 'DESC' },
    });

    if (newVerification) {
      await this.auditLogService.logVerificationResent(
        account.id,
        account.phoneNumber,
        newVerification.id,
        this.getAuditContext(firebaseUid),
      );
    }

    return {
      alreadyVerified: false,
      message: 'Verification code sent successfully',
      codeSent: true,
    };
  }
}
