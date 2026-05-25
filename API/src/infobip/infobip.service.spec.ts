import { Test, TestingModule } from '@nestjs/testing';
import { InfobipService } from './infobip.service';
import { ConfigService } from '@nestjs/config';
import { SmsMessage } from './entities/sms-message.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import axios from 'axios';

jest.mock('axios');

function createMockRepo<T extends ObjectLiteral>() {
  return {
    create: jest.fn(),
    save: jest.fn(),
  } as unknown as jest.Mocked<Repository<T>>;
}

describe('InfobipService', () => {
  let service: InfobipService;
  let smsRepo: jest.Mocked<Repository<SmsMessage>>;
  const mockAxiosInstance = { post: jest.fn() };

  beforeEach(async () => {
    (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);
    smsRepo = createMockRepo<SmsMessage>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InfobipService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'INFOBIP_BASE_URL') {
                return 'https://example.com';
              }
              if (key === 'INFOBIP_API_KEY') {
                return 'api-key';
              }
              if (key === 'INFOBIP_SENDER') {
                return 'Sponspay';
              }
              return undefined;
            },
          },
        },
        { provide: getRepositoryToken(SmsMessage), useValue: smsRepo },
      ],
    }).compile();

    service = module.get<InfobipService>(InfobipService);
    smsRepo.create.mockImplementation((data) => data as SmsMessage);
    smsRepo.save.mockImplementation(async (entity) => entity as SmsMessage);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('sends sms and stores provider response', async () => {
    mockAxiosInstance.post.mockResolvedValue({
      data: {
        messages: [
          {
            messageId: 'abc',
            status: { groupName: 'PENDING', description: 'Accepted', id: 1 },
          },
        ],
      },
    });

    const result = await service.sendSms({
      to: '+111',
      text: 'hello',
      userId: 'user-1',
      accountId: 'acc-1',
      verificationId: 'ver-1',
    });

    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/sms/3/messages', {
      messages: [
        {
          sender: 'Sponspay',
          destinations: [{ to: '111' }], // Plus sign should be stripped
          content: {
            text: 'hello',
          },
        },
      ],
    });
    expect(result.providerMessageId).toBe('abc');
    expect(result.status).toBe('PENDING');
    expect(smsRepo.save).toHaveBeenCalled();
  });

  it('handles phone numbers without plus sign correctly', async () => {
    mockAxiosInstance.post.mockResolvedValue({
      data: {
        messages: [
          {
            messageId: 'def',
            status: { groupName: 'PENDING', description: 'Accepted', id: 1 },
          },
        ],
      },
    });

    const result = await service.sendSms({
      to: '12155288992',
      text: 'hello',
    });

    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/sms/3/messages', {
      messages: [
        {
          sender: 'Sponspay',
          destinations: [{ to: '12155288992' }], // No plus sign, should remain unchanged
          content: {
            text: 'hello',
          },
        },
      ],
    });
    expect(result.providerMessageId).toBe('def');
    expect(result.status).toBe('PENDING');
  });

  it('records failure when sending sms fails', async () => {
    mockAxiosInstance.post.mockRejectedValue(new Error('network error'));

    await expect(
      service.sendSms({ to: '+111', text: 'hello' }),
    ).rejects.toThrow('network error');

    const savedEntity = smsRepo.save.mock.calls[0][0] as SmsMessage;
    expect(savedEntity.status).toBe('ERROR');
    expect(savedEntity.statusDescription).toContain('network error');
  });
});
