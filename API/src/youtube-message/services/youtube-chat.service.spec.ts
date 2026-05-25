import { Test, TestingModule } from '@nestjs/testing';
import { YouTubeChatService } from './youtube-chat.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Transaction } from '../../transaction/entities/transaction.entity';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { MessageType } from '../../transaction/entities/message-type.enum';
import { Currency } from '../../transaction/entities/currency.entity';

describe('YouTubeChatService', () => {
  let service: YouTubeChatService;
  let transactionRepository: jest.Mocked<Repository<Transaction>>;
  let mockYouTubeClient: any;

  beforeEach(async () => {
    mockYouTubeClient = {
      liveChatMessages: {
        insert: jest.fn(),
      },
    };

    const mockTransactionRepository = {
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YouTubeChatService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
      ],
    }).compile();

    service = module.get<YouTubeChatService>(YouTubeChatService);
    transactionRepository = module.get(getRepositoryToken(Transaction));

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('postThankYouChatMessage', () => {
    const mockCurrency: Currency = {
      id: '1',
      name: 'Kenyan Shilling',
      shortCode: 'KES',
      iso4217Numeric: 404,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockTransaction: Transaction = {
      id: 'txn-123',
      youtubeLiveChatId: 'live-chat-123',
      payerFullName: 'John Doe',
      amount: 500.0,
      currency: mockCurrency,
      messageContent: 'Keep up the great work!',
      messageType: MessageType.Livestream,
    } as any;

    it('should post chat message successfully and update transaction', async () => {
      const mockChatResponse = {
        data: {
          id: 'chat-message-123',
        },
      };

      mockYouTubeClient.liveChatMessages.insert.mockResolvedValue(
        mockChatResponse as any,
      );
      transactionRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.postThankYouChatMessage(mockTransaction, mockYouTubeClient);

      expect(mockYouTubeClient.liveChatMessages.insert).toHaveBeenCalledWith({
        part: ['snippet'],
        requestBody: {
          snippet: {
            liveChatId: 'live-chat-123',
            type: 'textMessageEvent',
            textMessageDetails: {
              messageText: expect.stringContaining(
                '💙 Thank you for your support, John Doe!',
              ),
            },
          },
        },
      });

      expect(transactionRepository.update).toHaveBeenCalledWith('txn-123', {
        youtubeMessageId: 'chat-message-123',
        youtubeMessagePostedAt: expect.any(Date),
      });

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Posted YouTube chat message'),
      );
    });

    it('should format simple thank you message without payment details', async () => {
      mockYouTubeClient.liveChatMessages.insert.mockResolvedValue({
        data: { id: 'chat-123' },
      } as any);

      await service.postThankYouChatMessage(mockTransaction, mockYouTubeClient);

      const insertCall =
        mockYouTubeClient.liveChatMessages.insert.mock.calls[0][0];
      const messageText =
        insertCall?.requestBody?.snippet?.textMessageDetails?.messageText;

      expect(messageText).toBeDefined();
      expect(messageText).toContain('💙 Thank you for your support, John Doe!');
      expect(messageText).not.toContain('500');
      expect(messageText).not.toContain('KES');
      expect(messageText).not.toContain('Keep up the great work!');
    });

    it('should handle 403 liveChatEnded error gracefully', async () => {
      const error = {
        code: 403,
        errors: [{ reason: 'liveChatEnded' }],
      };

      mockYouTubeClient.liveChatMessages.insert.mockRejectedValue(error);

      await service.postThankYouChatMessage(mockTransaction, mockYouTubeClient);

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('Livestream has ended'),
      );
      expect(transactionRepository.update).not.toHaveBeenCalled();
    });

    it('should handle 403 liveChatDisabled error gracefully', async () => {
      const error = {
        code: 403,
        errors: [{ reason: 'liveChatDisabled' }],
      };

      mockYouTubeClient.liveChatMessages.insert.mockRejectedValue(error);

      await service.postThankYouChatMessage(mockTransaction, mockYouTubeClient);

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('Live chat disabled'),
      );
      expect(transactionRepository.update).not.toHaveBeenCalled();
    });

    it('should handle 400 invalid liveChatId error', async () => {
      const error = {
        code: 400,
        message: 'Invalid liveChatId',
      };

      mockYouTubeClient.liveChatMessages.insert.mockRejectedValue(error);

      await service.postThankYouChatMessage(mockTransaction, mockYouTubeClient);

      expect(Logger.prototype.error).toHaveBeenCalled();
      expect(transactionRepository.update).not.toHaveBeenCalled();
    });

    it('should skip posting when liveChatId is missing', async () => {
      const txnWithoutLiveChat = {
        ...mockTransaction,
        youtubeLiveChatId: null,
      } as any;

      await service.postThankYouChatMessage(
        txnWithoutLiveChat,
        mockYouTubeClient,
      );

      expect(mockYouTubeClient.liveChatMessages.insert).not.toHaveBeenCalled();
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('Cannot post chat message - no live chat ID'),
      );
    });

    it('should handle generic errors gracefully', async () => {
      const genericError = new Error('Network timeout');

      mockYouTubeClient.liveChatMessages.insert.mockRejectedValue(genericError);

      await service.postThankYouChatMessage(mockTransaction, mockYouTubeClient);

      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  describe('formatChatMessage', () => {
    it('should format simple thank you with fan name', () => {
      const mockTransaction: Transaction = {
        id: 'txn-123',
        payerFullName: 'Jane Smith',
        amount: 100.0,
        messageContent: 'Great stream!',
        messageType: MessageType.Livestream,
      } as any;

      const message = service['formatChatMessage'](mockTransaction);

      expect(message).toBe('💙 Thank you for your support, Jane Smith!');
    });
  });
});
