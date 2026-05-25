import { Test, TestingModule } from '@nestjs/testing';
import { MarketingService } from './marketing.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { ZohoService } from '../zoho/zoho.service';
import { ContactUsDTO } from './dto/contact-us.dto';
import { CreateNewsDto, UpdateNewsDto } from './dto/news.dto';
import { News } from './entities/news.entity';
import { ContactUs } from './entities/contact-us.entity';
import { Country } from '../transaction/entities/country.entity';
import { Logger, NotFoundException } from '@nestjs/common';

describe('MarketingService', () => {
  let service: MarketingService;
  let newsRepository: jest.Mocked<Repository<News>>;
  let contactUsRepository: jest.Mocked<Repository<ContactUs>>;
  let countryRepository: jest.Mocked<Repository<Country>>;
  let mailService: jest.Mocked<MailService>;
  let configService: jest.Mocked<ConfigService>;
  let zohoService: jest.Mocked<ZohoService>;

  beforeEach(async () => {
    const mockNewsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      preload: jest.fn(),
      softDelete: jest.fn(),
    };

    const mockContactUsRepository = {
      save: jest.fn(),
    };

    const mockCountryRepository = {
      find: jest.fn(),
    };

    const mockMailService = {
      sendEmail: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockZohoService = {
      createContactAndPromoteToLead: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingService,
        {
          provide: getRepositoryToken(News),
          useValue: mockNewsRepository,
        },
        {
          provide: getRepositoryToken(ContactUs),
          useValue: mockContactUsRepository,
        },
        {
          provide: getRepositoryToken(Country),
          useValue: mockCountryRepository,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: ZohoService,
          useValue: mockZohoService,
        },
      ],
    }).compile();

    service = module.get<MarketingService>(MarketingService);
    newsRepository = module.get(getRepositoryToken(News));
    contactUsRepository = module.get(getRepositoryToken(ContactUs));
    countryRepository = module.get(getRepositoryToken(Country));
    mailService = module.get(MailService);
    configService = module.get(ConfigService);
    zohoService = module.get(ZohoService);

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

  describe('processContactUsRequest', () => {
    const mockContactUsDTO: ContactUsDTO = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      interest: 'Product Demo',
      country: 'US',
      phoneNumber: '+1234567890',
      message: 'I am interested in your product',
    };

    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'CONTACT_US_EMAIL':
            return 'contact@example.com';
          case 'FROM_EMAIL':
            return 'noreply@example.com';
          default:
            return undefined;
        }
      });
    });

    it('should process contact us request successfully', async () => {
      contactUsRepository.save.mockResolvedValue(mockContactUsDTO as any);
      mailService.sendEmail.mockResolvedValue([{} as any, {}]);
      zohoService.createContactAndPromoteToLead.mockResolvedValue(undefined);

      await service.processContactUsRequest(mockContactUsDTO);

      expect(contactUsRepository.save).toHaveBeenCalledWith(mockContactUsDTO);

      expect(mailService.sendEmail).toHaveBeenCalledWith({
        to: 'contact@example.com',
        from: 'noreply@example.com',
        subject: 'Contact us form submitted',
        html: expect.stringContaining('John Doe'),
      });
    });

    it('should handle contact us request without phone number', async () => {
      const contactWithoutPhone = { ...mockContactUsDTO };
      delete contactWithoutPhone.phoneNumber;

      contactUsRepository.save.mockResolvedValue(contactWithoutPhone as any);
      mailService.sendEmail.mockResolvedValue([{} as any, {}]);

      await service.processContactUsRequest(contactWithoutPhone);

      expect(mailService.sendEmail).toHaveBeenCalledWith({
        to: 'contact@example.com',
        from: 'noreply@example.com',
        subject: 'Contact us form submitted',
        html: expect.not.stringContaining('<p>Phone:'),
      });
    });

    it('should handle database insertion errors', async () => {
      const dbError = new Error('Database connection failed');
      contactUsRepository.save.mockRejectedValue(dbError);

      await expect(
        service.processContactUsRequest(mockContactUsDTO),
      ).rejects.toThrow(dbError);

      expect(contactUsRepository.save).toHaveBeenCalled();
      expect(mailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should handle email sending errors', async () => {
      contactUsRepository.save.mockResolvedValue(mockContactUsDTO as any);
      const emailError = new Error('Email service unavailable');
      mailService.sendEmail.mockRejectedValue(emailError);

      await expect(
        service.processContactUsRequest(mockContactUsDTO),
      ).rejects.toThrow(emailError);

      expect(contactUsRepository.save).toHaveBeenCalled();
      expect(mailService.sendEmail).toHaveBeenCalled();
    });

    it('should continue processing even if Zoho lead creation fails', async () => {
      contactUsRepository.save.mockResolvedValue(mockContactUsDTO as any);
      mailService.sendEmail.mockResolvedValue([{} as any, {}]);
      zohoService.createContactAndPromoteToLead.mockRejectedValue(
        new Error('Zoho API error'),
      );

      // Should not throw error even if Zoho fails
      await expect(
        service.processContactUsRequest(mockContactUsDTO),
      ).resolves.not.toThrow();

      expect(contactUsRepository.save).toHaveBeenCalled();
      expect(mailService.sendEmail).toHaveBeenCalled();
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create Zoho contact and lead'),
        expect.any(Error),
      );
    });

    it('should log success when Zoho lead creation succeeds', async () => {
      contactUsRepository.save.mockResolvedValue(mockContactUsDTO as any);
      mailService.sendEmail.mockResolvedValue([{} as any, {}]);
      zohoService.createContactAndPromoteToLead.mockResolvedValue(undefined);

      await service.processContactUsRequest(mockContactUsDTO);

      // Wait a bit for the async Zoho call to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Successfully created Zoho contact and promoted to lead',
        ),
      );
    });
  });

  describe('News', () => {
    const createNewsDto: CreateNewsDto = {
      title: 'Test Title',
      subtitle: 'Test Subtitle',
      content: 'Test Content',
    };

    const mockNews: News = {
      id: '1',
      ...createNewsDto,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a new news article', async () => {
      newsRepository.create.mockReturnValue(mockNews);
      newsRepository.save.mockResolvedValue(mockNews);

      const result = await service.createNews(createNewsDto);

      expect(newsRepository.create).toHaveBeenCalledWith(createNewsDto);
      expect(newsRepository.save).toHaveBeenCalledWith(mockNews);
      expect(result).toEqual(mockNews);
    });

    it('should get the latest news articles', async () => {
      const newsList = [mockNews];
      newsRepository.find.mockResolvedValue(newsList);

      const result = await service.getLatestNews(1);

      expect(newsRepository.find).toHaveBeenCalledWith({
        where: { deletedAt: undefined },
        order: { createdAt: 'DESC' },
        take: 1,
      });
      expect(result).toEqual(newsList);
    });

    it('should update an existing news article', async () => {
      const updateNewsDto: UpdateNewsDto = {
        title: 'Updated Title',
        subtitle: 'Updated Subtitle',
        content: 'Updated Content',
      };
      const updatedNews = { ...mockNews, ...updateNewsDto };

      newsRepository.preload.mockResolvedValue(updatedNews);
      newsRepository.save.mockResolvedValue(updatedNews);

      const result = await service.updateNews('1', updateNewsDto);

      expect(newsRepository.preload).toHaveBeenCalledWith({
        id: '1',
        ...updateNewsDto,
      });
      expect(newsRepository.save).toHaveBeenCalledWith(updatedNews);
      expect(result).toEqual(updatedNews);
    });

    it('should throw an error if news to update is not found', async () => {
      const updateNewsDto: UpdateNewsDto = {
        title: 'Updated Title',
        subtitle: 'Updated Subtitle',
        content: 'Updated Content',
      };
      newsRepository.preload.mockResolvedValue(undefined);

      await expect(service.updateNews('1', updateNewsDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should soft delete a news article', async () => {
      newsRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.softDeleteNews('1');

      expect(newsRepository.softDelete).toHaveBeenCalledWith('1');
    });

    it('should throw an error if news to soft delete is not found', async () => {
      newsRepository.softDelete.mockResolvedValue({ affected: 0 } as any);

      await expect(service.softDeleteNews('1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getCountryMarketData', () => {
    it('should return countries with market data, converting decimals to numbers', async () => {
      const mockCountries = [
        {
          iso3Code: 'KEN',
          iso2Code: 'KE',
          name: 'Kenya',
          creditCardPenetration: '4.40',
          mobilePenetration: '92.70',
        },
        {
          iso3Code: 'NGA',
          iso2Code: 'NG',
          name: 'Nigeria',
          creditCardPenetration: '3.20',
          mobilePenetration: '83.80',
        },
      ];
      countryRepository.find.mockResolvedValue(mockCountries as any);

      const result = await service.getCountryMarketData();

      expect(result).toEqual([
        {
          iso3Code: 'KEN',
          iso2Code: 'KE',
          name: 'Kenya',
          creditCardPenetration: 4.4,
          mobilePenetration: 92.7,
        },
        {
          iso3Code: 'NGA',
          iso2Code: 'NG',
          name: 'Nigeria',
          creditCardPenetration: 3.2,
          mobilePenetration: 83.8,
        },
      ]);
    });

    it('should return empty array when no countries have market data', async () => {
      countryRepository.find.mockResolvedValue([]);

      const result = await service.getCountryMarketData();

      expect(result).toEqual([]);
    });

    it('should query with correct where/order conditions', async () => {
      countryRepository.find.mockResolvedValue([]);

      await service.getCountryMarketData();

      expect(countryRepository.find).toHaveBeenCalledWith({
        where: {
          creditCardPenetration: expect.anything(),
          mobilePenetration: expect.anything(),
          iso2Code: expect.anything(),
        },
        order: { name: 'ASC' },
      });
    });
  });
});
