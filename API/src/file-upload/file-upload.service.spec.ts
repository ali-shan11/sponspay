import { Test, TestingModule } from '@nestjs/testing';
import { FileUploadService } from './file-upload.service';
import { ConfigService } from '@nestjs/config';
import { Logger, UnprocessableEntityException } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';

// Mock the @google-cloud/storage module
jest.mock('@google-cloud/storage');

// Type for event callbacks used in blob stream mocking
type EventCallback = (error?: Error) => void;

describe('FileUploadService', () => {
  let service: FileUploadService;
  let configService: jest.Mocked<ConfigService>;
  let mockStorage: jest.Mocked<Storage>;
  let mockBucket: any;
  let mockFile: any;
  let mockBlobStream: any;

  beforeEach(async () => {
    mockBlobStream = {
      on: jest.fn(),
      end: jest.fn(),
    };

    mockFile = {
      createWriteStream: jest.fn().mockReturnValue(mockBlobStream),
      name: 'test-file.jpg',
    };

    mockBucket = {
      file: jest.fn().mockReturnValue(mockFile),
    };

    mockStorage = {
      bucket: jest.fn().mockReturnValue(mockBucket),
    } as any;

    (Storage as jest.MockedClass<typeof Storage>).mockImplementation(
      () => mockStorage,
    );

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileUploadService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FileUploadService>(FileUploadService);
    configService = module.get(ConfigService);

    // Mock logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadPhotosToGCS', () => {
    const mockFiles: Express.Multer.File[] = [
      {
        originalname: 'test1.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test file content 1'),
        size: 1024,
      } as Express.Multer.File,
      {
        originalname: 'test2.png',
        mimetype: 'image/png',
        buffer: Buffer.from('test file content 2'),
        size: 2048,
      } as Express.Multer.File,
    ];

    const userId = 'user123';

    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'PHOTOS_BUCKET':
            return 'test-bucket';
          case 'SERVICE_ACCOUNT':
            return 'test@service.com';
          case 'SERVICE_ACCOUNT_PRIVATE_KEY':
            return 'private-key';
          case 'SERVICE_ACCOUNT_USER':
            return 'user-id';
          default:
            return undefined;
        }
      });
    });

    it('should upload files successfully', async () => {
      // Mock successful upload
      mockBlobStream.on.mockImplementation(
        (event: string, callback: EventCallback) => {
          if (event === 'finish') {
            setTimeout(() => callback(), 0);
          }
          return mockBlobStream;
        },
      );

      const result = await service.uploadPhotosToGCS(mockFiles, userId);

      expect(mockStorage.bucket).toHaveBeenCalledWith('test-bucket');
      expect(mockBucket.file).toHaveBeenCalledTimes(2);
      expect(mockFile.createWriteStream).toHaveBeenCalledTimes(2);
      expect(mockBlobStream.end).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatch(
        /https:\/\/storage\.googleapis\.com\/test-bucket\/.+/,
      );
      expect(result[1]).toMatch(
        /https:\/\/storage\.googleapis\.com\/test-bucket\/.+/,
      );
    });

    it('should handle upload errors gracefully', async () => {
      // Mock upload error for first file, success for second
      let callCount = 0;
      mockBlobStream.on.mockImplementation(
        (event: string, callback: EventCallback) => {
          callCount++;
          if (event === 'error' && callCount <= 2) {
            setTimeout(() => callback(new Error('Upload failed')), 0);
          } else if (event === 'finish' && callCount > 2) {
            setTimeout(() => callback(), 0);
          }
          return mockBlobStream;
        },
      );

      const result = await service.uploadPhotosToGCS(mockFiles, userId);

      expect(result).toHaveLength(1);
      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should skip unsupported file types', async () => {
      const unsupportedFiles: Express.Multer.File[] = [
        {
          originalname: 'test.txt',
          mimetype: 'text/plain',
          buffer: Buffer.from('test content'),
          size: 1024,
        } as Express.Multer.File,
      ];

      await expect(
        service.uploadPhotosToGCS(unsupportedFiles, userId),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Unsupported file type: text/plain'),
      );
    });

    it('should throw UnprocessableEntityException when no files are uploaded', async () => {
      // Mock all uploads to fail
      mockBlobStream.on.mockImplementation(
        (event: string, callback: EventCallback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Upload failed')), 0);
          }
          return mockBlobStream;
        },
      );

      await expect(
        service.uploadPhotosToGCS(mockFiles, userId),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should generate unique filenames with user ID', async () => {
      mockBlobStream.on.mockImplementation(
        (event: string, callback: EventCallback) => {
          if (event === 'finish') {
            setTimeout(() => callback(), 0);
          }
          return mockBlobStream;
        },
      );

      await service.uploadPhotosToGCS([mockFiles[0]], userId);

      expect(mockBucket.file).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^${userId}-[a-f0-9-]+.jpeg$`)),
      );
    });

    it('should handle different image formats correctly', async () => {
      const differentFormatFiles: Express.Multer.File[] = [
        {
          originalname: 'test.gif',
          mimetype: 'image/gif',
          buffer: Buffer.from('gif content'),
          size: 1024,
        } as Express.Multer.File,
        {
          originalname: 'test.webp',
          mimetype: 'image/webp',
          buffer: Buffer.from('webp content'),
          size: 1024,
        } as Express.Multer.File,
      ];

      mockBlobStream.on.mockImplementation(
        (event: string, callback: EventCallback) => {
          if (event === 'finish') {
            setTimeout(() => callback(), 0);
          }
          return mockBlobStream;
        },
      );

      const result = await service.uploadPhotosToGCS(
        differentFormatFiles,
        userId,
      );

      expect(result).toHaveLength(2);
      expect(mockBucket.file).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^${userId}-[a-f0-9-]+.gif$`)),
      );
      expect(mockBucket.file).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^${userId}-[a-f0-9-]+.webp$`)),
      );
    });
  });
});
