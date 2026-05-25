import { Test, TestingModule } from '@nestjs/testing';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';
import { ContactUsDTO } from './dto/contact-us.dto';
import { CreateNewsDto, UpdateNewsDto } from './dto/news.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ApiKeyGuard } from '../auth/api-key.guard';

describe('MarketingController', () => {
  let controller: MarketingController;
  let service: MarketingService;

  const mockMarketingService = {
    processContactUsRequest: jest.fn(),
    createNews: jest.fn(),
    getLatestNews: jest.fn(),
    updateNews: jest.fn(),
    softDeleteNews: jest.fn(),
    getLandingPageDetails: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketingController],
      providers: [
        {
          provide: MarketingService,
          useValue: mockMarketingService,
        },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MarketingController>(MarketingController);
    service = module.get<MarketingService>(MarketingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendContactUsEmail', () => {
    it('should call processContactUsRequest', async () => {
      const dto = new ContactUsDTO();
      await controller.sendContactUsEmail(dto);
      expect(service.processContactUsRequest).toHaveBeenCalledWith(dto);
    });
  });

  describe('getLandingPageDetails', () => {
    it('should call getLandingPageDetails', async () => {
      await controller.getLandingPageDetails();
      expect(service.getLandingPageDetails).toHaveBeenCalled();
    });
  });

  describe('createNews', () => {
    it('should call createNews', async () => {
      const dto = new CreateNewsDto();
      await controller.createNews(dto);
      expect(service.createNews).toHaveBeenCalledWith(dto);
    });
  });

  describe('getLatestNews', () => {
    it('should call getLatestNews', async () => {
      await controller.getLatestNews(5);
      expect(service.getLatestNews).toHaveBeenCalledWith(5);
    });
  });

  describe('updateNews', () => {
    it('should call updateNews', async () => {
      const dto = new UpdateNewsDto();
      await controller.updateNews('1', dto);
      expect(service.updateNews).toHaveBeenCalledWith('1', dto);
    });
  });

  describe('softDeleteNews', () => {
    it('should call softDeleteNews', async () => {
      await controller.softDeleteNews('1');
      expect(service.softDeleteNews).toHaveBeenCalledWith('1');
    });
  });
});
