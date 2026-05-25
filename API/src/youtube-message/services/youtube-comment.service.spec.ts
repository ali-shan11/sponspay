import { Test, TestingModule } from '@nestjs/testing';
import { YouTubeCommentService } from './youtube-comment.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Transaction } from '../../transaction/entities/transaction.entity';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { MessageType } from '../../transaction/entities/message-type.enum';
import { Currency } from '../../transaction/entities/currency.entity';

describe('YouTubeCommentService', () => {
  let service: YouTubeCommentService;
  let transactionRepository: jest.Mocked<Repository<Transaction>>;
  let mockYouTubeClient: any;

  beforeEach(async () => {
    mockYouTubeClient = {
      commentThreads: {
        insert: jest.fn(),
      },
    };

    const mockTransactionRepository = {
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YouTubeCommentService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
      ],
    }).compile();

    service = module.get<YouTubeCommentService>(YouTubeCommentService);
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

  describe('postThankYouComment', () => {
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
      youtubeVideoId: 'dQw4w9WgXcQ',
      payerFullName: 'John Doe',
      amount: 500.0,
      currency: mockCurrency,
      messageContent: 'Keep up the great work!',
      subject: 'Support for your channel',
      messageType: MessageType.Video,
    } as any;

    it('should post comment successfully and update transaction', async () => {
      const mockCommentResponse = {
        data: {
          id: 'comment-123',
        },
      };

      mockYouTubeClient.commentThreads.insert.mockResolvedValue(
        mockCommentResponse as any,
      );
      transactionRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.postThankYouComment(mockTransaction, mockYouTubeClient);

      expect(mockYouTubeClient.commentThreads.insert).toHaveBeenCalledWith({
        part: ['snippet'],
        requestBody: {
          snippet: {
            videoId: 'dQw4w9WgXcQ',
            topLevelComment: {
              snippet: {
                textOriginal: expect.stringContaining(
                  'Thank you for your support, John Doe!',
                ),
              },
            },
          },
        },
      });

      expect(transactionRepository.update).toHaveBeenCalledWith('txn-123', {
        youtubeCommentId: 'comment-123',
        youtubeMessagePostedAt: expect.any(Date),
      });

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Posted YouTube comment'),
      );
    });

    it('should format simple thank you message without payment details', async () => {
      mockYouTubeClient.commentThreads.insert.mockResolvedValue({
        data: { id: 'comment-123' },
      } as any);

      await service.postThankYouComment(mockTransaction, mockYouTubeClient);

      const insertCall =
        mockYouTubeClient.commentThreads.insert.mock.calls[0][0];
      const messageText =
        insertCall?.requestBody?.snippet?.topLevelComment?.snippet
          ?.textOriginal;

      expect(messageText).toContain('Thank you for your support, John Doe!');
      expect(messageText).toContain('Sent via SponsPay');
      expect(messageText).not.toContain('500');
      expect(messageText).not.toContain('KES');
      expect(messageText).not.toContain('Keep up the great work!');
      expect(messageText).not.toContain('Support for your channel');
    });

    it('should format same message regardless of subject', async () => {
      const txnWithoutSubject = {
        ...mockTransaction,
        subject: null,
      } as any;

      mockYouTubeClient.commentThreads.insert.mockResolvedValue({
        data: { id: 'comment-456' },
      } as any);

      await service.postThankYouComment(txnWithoutSubject, mockYouTubeClient);

      const insertCall =
        mockYouTubeClient.commentThreads.insert.mock.calls[0][0];
      const messageText =
        insertCall?.requestBody?.snippet?.topLevelComment?.snippet
          ?.textOriginal;

      expect(messageText).toContain('Thank you for your support, John Doe!');
      expect(messageText).toContain('Sent via SponsPay');
      expect(messageText).not.toContain('Keep up the great work!');
    });

    it('should handle 403 commentsDisabled error gracefully', async () => {
      const error = {
        code: 403,
        errors: [{ reason: 'commentsDisabled' }],
      };

      mockYouTubeClient.commentThreads.insert.mockRejectedValue(error);

      await service.postThankYouComment(mockTransaction, mockYouTubeClient);

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('Comments disabled on video'),
      );
      expect(transactionRepository.update).not.toHaveBeenCalled();
    });

    it('should handle 403 other errors and log appropriately', async () => {
      const error = {
        code: 403,
        errors: [{ reason: 'forbidden' }],
      };

      mockYouTubeClient.commentThreads.insert.mockRejectedValue(error);

      await service.postThankYouComment(mockTransaction, mockYouTubeClient);

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Permission denied when posting comment'),
      );
      expect(transactionRepository.update).not.toHaveBeenCalled();
    });

    it('should handle 400 bad request error gracefully', async () => {
      const error = {
        code: 400,
        message: 'Bad Request',
      };

      mockYouTubeClient.commentThreads.insert.mockRejectedValue(error);

      await service.postThankYouComment(mockTransaction, mockYouTubeClient);

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid request when posting comment'),
      );
      expect(transactionRepository.update).not.toHaveBeenCalled();
    });

    it('should skip posting when videoId is missing', async () => {
      const txnWithoutVideo = {
        ...mockTransaction,
        youtubeVideoId: null,
      } as any;

      await service.postThankYouComment(txnWithoutVideo, mockYouTubeClient);

      expect(mockYouTubeClient.commentThreads.insert).not.toHaveBeenCalled();
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('Cannot post comment - no video ID'),
      );
    });

    it('should handle generic errors gracefully', async () => {
      const genericError = new Error('Network timeout');

      mockYouTubeClient.commentThreads.insert.mockRejectedValue(genericError);

      await service.postThankYouComment(mockTransaction, mockYouTubeClient);

      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  describe('formatCommentMessage', () => {
    it('should format simple thank you message with emoji', () => {
      const mockTransaction: Transaction = {
        id: 'txn-123',
        payerFullName: 'Jane Smith',
        amount: 1000.0,
        messageContent: 'Amazing content!',
        subject: 'Monthly support',
        messageType: MessageType.Video,
      } as any;

      const message = service['formatCommentMessage'](mockTransaction);

      expect(message).toContain('💙');
      expect(message).toContain('Thank you for your support, Jane Smith!');
      expect(message).toContain('Sent via SponsPay');
      expect(message).not.toContain('1000');
      expect(message).not.toContain('Amazing content!');
      expect(message).not.toContain('Monthly support');
    });
  });
});
