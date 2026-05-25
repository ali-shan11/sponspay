import { ChannelSnapshot } from './channel-snapshot.entity';
import { YouTubeChannel } from './youtube-channel.entity';

describe('ChannelSnapshot Entity', () => {
  let channelSnapshot: ChannelSnapshot;
  let youtubeChannel: YouTubeChannel;

  beforeEach(() => {
    youtubeChannel = new YouTubeChannel();
    youtubeChannel.id = 'channel-123';
    youtubeChannel.channelId = 'UC1234567890';
    youtubeChannel.channelName = 'Test Channel';

    channelSnapshot = new ChannelSnapshot();
    channelSnapshot.id = 'snapshot-123';
    channelSnapshot.channelId = youtubeChannel.id;
    channelSnapshot.totalSubscribers = 100000;
    channelSnapshot.countryAnalysis = {
      countries: [
        {
          name: 'Kenya',
          viewers: 25117,
          creditCardShare: 6.35,
          avgViewersWithYoutube: 1595,
          mobileSimShare: 79,
          avgAdditionalViewers: 19842,
          avgTotalViewersWithPayment: 21437,
        },
      ],
    };
    channelSnapshot.youtubePayingUsersPercentage = 15.5;
    channelSnapshot.sponspayPayingUsersPercentage = 8.2;
    channelSnapshot.channel = youtubeChannel;
  });

  it('should be defined', () => {
    expect(channelSnapshot).toBeDefined();
  });

  it('should have correct properties', () => {
    expect(channelSnapshot.id).toBe('snapshot-123');
    expect(channelSnapshot.channelId).toBe(youtubeChannel.id);
    expect(channelSnapshot.totalSubscribers).toBe(100000);
    expect(channelSnapshot.youtubePayingUsersPercentage).toBe(15.5);
    expect(channelSnapshot.sponspayPayingUsersPercentage).toBe(8.2);
    expect(channelSnapshot.channel).toBe(youtubeChannel);
  });

  it('should have correct country analysis structure', () => {
    expect(channelSnapshot.countryAnalysis).toBeDefined();
    expect(channelSnapshot.countryAnalysis).toHaveProperty('countries');
    expect(
      Array.isArray((channelSnapshot.countryAnalysis as any).countries),
    ).toBe(true);

    const countries = (channelSnapshot.countryAnalysis as any).countries;
    expect(countries[0]).toHaveProperty('name', 'Kenya');
    expect(countries[0]).toHaveProperty('viewers', 25117);
    expect(countries[0]).toHaveProperty('creditCardShare', 6.35);
  });

  it('should have relationship with YouTubeChannel', () => {
    expect(channelSnapshot.channel).toBeInstanceOf(YouTubeChannel);
    expect(channelSnapshot.channel.id).toBe(youtubeChannel.id);
  });

  it('should validate percentage ranges', () => {
    channelSnapshot.youtubePayingUsersPercentage = 0;
    expect(channelSnapshot.youtubePayingUsersPercentage).toBe(0);

    channelSnapshot.youtubePayingUsersPercentage = 100;
    expect(channelSnapshot.youtubePayingUsersPercentage).toBe(100);

    channelSnapshot.sponspayPayingUsersPercentage = 50.5;
    expect(channelSnapshot.sponspayPayingUsersPercentage).toBe(50.5);
  });
});
