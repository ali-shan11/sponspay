import { TelegramChannel } from './telegram-channel.entity';
import { YouTubeChannel } from './youtube-channel.entity';

describe('TelegramChannel Entity', () => {
  it('should create a TelegramChannel instance', () => {
    const telegramChannel = new TelegramChannel();
    expect(telegramChannel).toBeInstanceOf(TelegramChannel);
  });

  it('should have all required properties', () => {
    const telegramChannel = new TelegramChannel();

    telegramChannel.id = 1;
    telegramChannel.channelHandle = 'test_channel';
    telegramChannel.channelId = 'telegram-123';
    telegramChannel.youtubeChannelId = 'yt-uuid-123';
    telegramChannel.createdAt = new Date();
    telegramChannel.updatedAt = new Date();

    expect(telegramChannel.id).toBe(1);
    expect(telegramChannel.channelHandle).toBe('test_channel');
    expect(telegramChannel.channelId).toBe('telegram-123');
    expect(telegramChannel.youtubeChannelId).toBe('yt-uuid-123');
    expect(telegramChannel.createdAt).toBeInstanceOf(Date);
    expect(telegramChannel.updatedAt).toBeInstanceOf(Date);
  });

  it('should allow nullable channelId', () => {
    const telegramChannel = new TelegramChannel();

    telegramChannel.channelHandle = 'test_channel';
    telegramChannel.channelId = undefined;
    telegramChannel.youtubeChannelId = 'yt-uuid-123';

    expect(telegramChannel.channelId).toBeUndefined();
  });

  it('should establish relationship with YouTubeChannel entity', () => {
    const ytChannel = new YouTubeChannel();
    ytChannel.id = 'yt-uuid-123';
    ytChannel.channelId = 'UC1234567890';
    ytChannel.channelName = 'Test Channel';

    const telegramChannel = new TelegramChannel();
    telegramChannel.id = 1;
    telegramChannel.channelHandle = 'test_channel';
    telegramChannel.channelId = 'telegram-123';
    telegramChannel.youtubeChannelId = ytChannel.id;
    telegramChannel.youtubeChannel = ytChannel;
    telegramChannel.createdAt = new Date();
    telegramChannel.updatedAt = new Date();

    expect(telegramChannel.youtubeChannel).toBe(ytChannel);
    expect(telegramChannel.youtubeChannelId).toBe(ytChannel.id);
  });
});
