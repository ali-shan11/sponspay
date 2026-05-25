import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmsMessage } from './entities/sms-message.entity';
import { User } from '../creator/entities/user.entity';
import { Account } from '../accounts/entities/account.entity';
import { AccountVerification } from '../accounts/entities/account-verification.entity';

export interface SendSmsParams {
  to: string;
  text: string;
  userId?: string;
  accountId?: string;
  verificationId?: string;
}

interface InfobipSmsResponse {
  messages?: Array<{
    to: string;
    messageId?: string;
    smsCount?: number;
    status?: {
      groupId?: number;
      groupName?: string;
      id?: number;
      name?: string;
      description?: string;
    };
  }>;
}

@Injectable()
export class InfobipService {
  private readonly logger = new Logger(InfobipService.name);
  private readonly httpClient: AxiosInstance;
  private readonly from: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(SmsMessage)
    private readonly smsRepo: Repository<SmsMessage>,
  ) {
    const baseUrl = this.configService.get<string>('INFOBIP_BASE_URL');
    const apiKey = this.configService.get<string>('INFOBIP_API_KEY');
    this.from = this.configService.get<string>('INFOBIP_SENDER')!;

    this.httpClient = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: {
        Authorization: `App ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  async sendSms(params: SendSmsParams): Promise<SmsMessage> {
    // Strip the plus sign from the phone number for Infobip API
    const cleanedPhoneNumber = params.to.startsWith('+')
      ? params.to.substring(1)
      : params.to;

    const message = this.smsRepo.create({
      to: params.to, // Store original number with plus sign
      text: params.text,
      status: 'PENDING',
      statusDescription: null,
      statusCode: null,
      sentAt: new Date(),
      resolvedAt: null,
      user: params.userId ? ({ id: params.userId } as Pick<User, 'id'>) : null,
      account: params.accountId
        ? ({ id: params.accountId } as Pick<Account, 'id'>)
        : null,
      verification: params.verificationId
        ? ({ id: params.verificationId } as Pick<AccountVerification, 'id'>)
        : null,
    });

    try {
      const response = await this.httpClient.post<InfobipSmsResponse>(
        '/sms/3/messages',
        {
          messages: [
            {
              sender: this.from,
              destinations: [{ to: cleanedPhoneNumber }], // Use cleaned number for API
              content: {
                text: params.text,
              },
            },
          ],
        },
      );

      const payload = response.data?.messages?.[0];
      message.providerMessageId = payload?.messageId ?? null;
      message.status = payload?.status?.groupName || 'UNKNOWN';
      message.statusDescription = payload?.status?.description || null;
      message.statusCode = payload?.status?.id
        ? String(payload.status.id)
        : null;
      message.resolvedAt =
        payload?.status?.groupName &&
        ['DELIVERED', 'FAILED', 'UNDELIVERABLE'].includes(
          payload.status.groupName,
        )
          ? new Date()
          : null;

      const saved = await this.smsRepo.save(message);
      this.logger.debug(
        `Sent SMS to ${params.to} (cleaned: ${cleanedPhoneNumber})`,
      );
      return saved;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      const description =
        axiosError.response?.data?.requestError?.serviceException?.text ||
        axiosError.response?.data?.message ||
        axiosError.message;
      message.status = 'ERROR';
      message.statusDescription = description;
      message.statusCode = null;
      message.resolvedAt = new Date();
      await this.smsRepo.save(message);
      this.logger.error(
        `Failed to send SMS to ${params.to} (cleaned: ${cleanedPhoneNumber}): ${description}`,
        axiosError.stack,
      );
      throw error;
    }
  }
}
