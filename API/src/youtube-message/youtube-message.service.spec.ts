import { Test, TestingModule } from '@nestjs/testing';
import { YouTubeMessageService } from './youtube-message.service';
import { YouTubeTokenService } from './services/youtube-token.service';
import { YouTubeCommentService } from './services/youtube-comment.service';
import { YouTubeChatService } from './services/youtube-chat.service';
import { YouTubeVideoInfoService } from './services/youtube-video-info.service';
import { Logger } from '@nestjs/common';
import { Transaction } from '../transaction/entities/transaction.entity';
import { MessageType } from '../transaction/entities/message-type.enum';
import { Currency } from '../transaction/entities/currency.entity';
import { youtube_v3 } from 'googleapis';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('YouTubeMessageService', () => {
  let service: YouTubeMessageService;
  let tokenService: jest.Mocked<YouTubeTokenService>;
  let commentService: jest.Mocked<YouTubeCommentService>;
  let chatService: jest.Mocked<YouTubeChatService>;

  const mockYouTubeClient = {
    commentThreads: { insert: jest.fn() },
    liveChatMessages: { insert: jest.fn() },
  } as any as youtube_v3.Youtube;

  beforeEach(async () => {
    const mockTokenService = {
      getYouTubeClient: jest.fn(),
    };

    const mockCommentService = {
      postThankYouComment: jest.fn(),
    };

    const mockChatService = {
      postThankYouChatMessage: jest.fn(),
    };

    const mockVideoInfoService = {
      getLiveChatId: jest.fn(),
    };

    const mockTransactionRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YouTubeMessageService,
        {
          provide: YouTubeTokenService,
          useValue: mockTokenService,
        },
        {
          provide: YouTubeCommentService,
          useValue: mockCommentService,
        },
        {
          provide: YouTubeChatService,
          useValue: mockChatService,
        },
        {
          provide: YouTubeVideoInfoService,
          useValue: mockVideoInfoService,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
      ],
    }).compile();

    service = module.get<YouTubeMessageService>(YouTubeMessageService);
    tokenService = module.get(YouTubeTokenService);
    commentService = module.get(YouTubeCommentService);
    chatService = module.get(YouTubeChatService);

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

  describe('sendThankYouMessage', () => {
    const mockCurrency: Currency = {
      id: '1',
      name: 'Kenyan Shilling',
      shortCode: 'KES',
      iso4217Numeric: 404,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockYouTubeChannel = {
      userChannels: [
        {
          role: 'owner',
          user: { id: 'user-123', firebaseUid: 'firebase-uid-123' },
        },
      ],
    };

    const mockVideoTransaction: Transaction = {
      id: 'txn-video-123',
      youtubeVideoId: 'dQw4w9WgXcQ',
      youtubeLiveChatId: null,
      payerFullName: 'John Doe',
      amount: 500.0,
      currency: mockCurrency,
      messageContent: 'Great content!',
      messageType: MessageType.Video,
      youtubeChannel: mockYouTubeChannel,
    } as any;

    const mockLivestreamTransaction: Transaction = {
      id: 'txn-livestream-123',
      youtubeVideoId: 'live-video-123',
      youtubeLiveChatId: 'live-chat-123',
      payerFullName: 'Jane Smith',
      amount: 1000.0,
      currency: mockCurrency,
      messageContent: 'Amazing stream!',
      messageType: MessageType.Livestream,
      youtubeChannel: mockYouTubeChannel,
    } as any;

    it('should skip when no YouTube video ID present', async () => {
      const txnWithoutVideo = {
        ...mockVideoTransaction,
        youtubeVideoId: null,
      } as any;

      await service.sendThankYouMessage(txnWithoutVideo);

      expect(tokenService.getYouTubeClient).not.toHaveBeenCalled();
      expect(commentService.postThankYouComment).not.toHaveBeenCalled();
      expect(chatService.postThankYouChatMessage).not.toHaveBeenCalled();
    });

    it('should skip when creator has not connected YouTube', async () => {
      tokenService.getYouTubeClient.mockResolvedValue(null);

      await service.sendThankYouMessage(mockVideoTransaction);

      expect(tokenService.getYouTubeClient).toHaveBeenCalledWith('user-123');
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining("hasn't connected YouTube"),
      );
      expect(commentService.postThankYouComment).not.toHaveBeenCalled();
    });

    it('should route video transaction to comment service', async () => {
      tokenService.getYouTubeClient.mockResolvedValue(mockYouTubeClient);
      commentService.postThankYouComment.mockResolvedValue(undefined);

      await service.sendThankYouMessage(mockVideoTransaction);

      expect(tokenService.getYouTubeClient).toHaveBeenCalledWith('user-123');
      expect(commentService.postThankYouComment).toHaveBeenCalledWith(
        mockVideoTransaction,
        mockYouTubeClient,
      );
      expect(chatService.postThankYouChatMessage).not.toHaveBeenCalled();
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Posted YouTube video message'),
      );
    });

    it('should route livestream transaction to chat service', async () => {
      tokenService.getYouTubeClient.mockResolvedValue(mockYouTubeClient);
      chatService.postThankYouChatMessage.mockResolvedValue(undefined);

      await service.sendThankYouMessage(mockLivestreamTransaction);

      expect(tokenService.getYouTubeClient).toHaveBeenCalledWith('user-123');
      expect(chatService.postThankYouChatMessage).toHaveBeenCalledWith(
        mockLivestreamTransaction,
        mockYouTubeClient,
      );
      expect(commentService.postThankYouComment).not.toHaveBeenCalled();
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Posted YouTube livestream message'),
      );
    });

    it('should swallow all errors and log them', async () => {
      const error = new Error('YouTube API error');
      tokenService.getYouTubeClient.mockRejectedValue(error);

      // Should not throw
      await expect(
        service.sendThankYouMessage(mockVideoTransaction),
      ).resolves.toBeUndefined();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to post YouTube message'),
        expect.stringContaining('YouTube API error'),
      );
    });

    it('should handle comment service errors gracefully', async () => {
      const commentError = new Error('Comment posting failed');
      tokenService.getYouTubeClient.mockResolvedValue(mockYouTubeClient);
      commentService.postThankYouComment.mockRejectedValue(commentError);

      await expect(
        service.sendThankYouMessage(mockVideoTransaction),
      ).resolves.toBeUndefined();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to post YouTube message'),
        expect.stringContaining('Comment posting failed'),
      );
    });

    it('should handle chat service errors gracefully', async () => {
      const chatError = new Error('Chat posting failed');
      tokenService.getYouTubeClient.mockResolvedValue(mockYouTubeClient);
      chatService.postThankYouChatMessage.mockRejectedValue(chatError);

      await expect(
        service.sendThankYouMessage(mockLivestreamTransaction),
      ).resolves.toBeUndefined();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to post YouTube message'),
        expect.stringContaining('Chat posting failed'),
      );
    });

    it('should handle transactions with no channel owner gracefully', async () => {
      const txnWithoutOwner = {
        ...mockVideoTransaction,
        youtubeChannel: { userChannels: [] },
      } as any;

      // Should not throw - graceful degradation
      await expect(
        service.sendThankYouMessage(txnWithoutOwner),
      ).resolves.toBeUndefined();

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('No channel owner found'),
      );
      expect(tokenService.getYouTubeClient).not.toHaveBeenCalled();
    });

    it('should handle missing messageType gracefully', async () => {
      const txnWithoutType = {
        ...mockVideoTransaction,
        messageType: null,
      } as any;

      tokenService.getYouTubeClient.mockResolvedValue(mockYouTubeClient);
      commentService.postThankYouComment.mockResolvedValue(undefined);

      await service.sendThankYouMessage(txnWithoutType);

      // Should default to comment service when messageType is null/undefined
      expect(commentService.postThankYouComment).toHaveBeenCalled();
    });
  });

  describe('error handling philosophy', () => {
    const mockTransaction: Transaction = {
      id: 'txn-123',
      youtubeVideoId: 'video-123',
      messageType: MessageType.Video,
      currency: { id: '1', shortCode: 'KES' },
      youtubeChannel: {
        userChannels: [{ role: 'owner', user: { id: 'user-123' } }],
      },
    } as any;

    it('should never throw errors to caller (graceful degradation)', async () => {
      // Test various error scenarios
      const errors = [
        new Error('Network error'),
        new Error('Token expired'),
        new Error('API quota exceeded'),
        { code: 403, message: 'Forbidden' },
        { code: 500, message: 'Internal server error' },
      ];

      for (const error of errors) {
        tokenService.getYouTubeClient.mockRejectedValueOnce(error);
        await expect(
          service.sendThankYouMessage(mockTransaction),
        ).resolves.toBeUndefined();
      }

      expect(Logger.prototype.error).toHaveBeenCalledTimes(errors.length);
    });

    it('should log all errors with transaction context', async () => {
      const error = new Error('Test error');
      tokenService.getYouTubeClient.mockRejectedValue(error);

      await service.sendThankYouMessage(mockTransaction);

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('txn-123'),
        expect.any(String),
      );
    });
  });
});
