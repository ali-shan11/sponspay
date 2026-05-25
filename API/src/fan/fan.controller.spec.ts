import { Test, TestingModule } from '@nestjs/testing';
import { FanController } from './fan.controller';
import { FanService } from './fan.service';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { ChannelInfoResponseDto } from './dto/channel-info.response.dto';
import { NotFoundException } from '@nestjs/common';

describe('FanController', () => {
  let controller: FanController;
  let fanService: jest.Mocked<Partial<FanService>>;

  beforeEach(async () => {
    fanService = {
      getChannelInfo: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FanController],
      providers: [{ provide: FanService, useValue: fanService }],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FanController>(FanController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const EMPTY_REFERRAL = {
    referralSource: null,
    referralMedium: null,
    referralCampaign: null,
    referrerUrl: null,
    referrerNetwork: null,
  };

  it('calls FanService.getChannelInfo and returns DTO', async () => {
    const mockDto: ChannelInfoResponseDto = {
      channelHandle: 'mychannel',
      youtubeEmbed: null,
      recentMessages: [],
    } as any;

    (fanService.getChannelInfo as jest.Mock).mockResolvedValue(mockDto);

    const res = await controller.getChannelInfo('MyChannel', { limit: 5 });

    expect(fanService.getChannelInfo).toHaveBeenCalledWith(
      'MyChannel',
      5,
      EMPTY_REFERRAL,
    );
    expect(res).toEqual(mockDto);
  });

  it('forwards referral query params to the service', async () => {
    const mockDto: ChannelInfoResponseDto = {
      channelHandle: 'mychannel',
      youtubeEmbed: null,
      recentMessages: [],
    } as any;
    (fanService.getChannelInfo as jest.Mock).mockResolvedValue(mockDto);

    await controller.getChannelInfo('mychannel', {
      limit: 5,
      referralSource: 'youtube',
      referralMedium: 'social',
      referralCampaign: 'launch',
      referrer: 'https://youtu.be/abc',
      network: 'youtube',
    });

    expect(fanService.getChannelInfo).toHaveBeenCalledWith('mychannel', 5, {
      referralSource: 'youtube',
      referralMedium: 'social',
      referralCampaign: 'launch',
      referrerUrl: 'https://youtu.be/abc',
      referrerNetwork: 'youtube',
    });
  });

  it('propagates NotFoundException from service', async () => {
    (fanService.getChannelInfo as jest.Mock).mockRejectedValue(
      new NotFoundException('not found'),
    );

    await expect(
      controller.getChannelInfo('missing', { limit: 5 }),
    ).rejects.toThrow(NotFoundException);
    expect(fanService.getChannelInfo).toHaveBeenCalledWith(
      'missing',
      5,
      EMPTY_REFERRAL,
    );
  });
});
