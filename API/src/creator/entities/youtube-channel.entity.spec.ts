import { YouTubeChannel } from './youtube-channel.entity';
import { ChannelSnapshot } from './channel-snapshot.entity';
import { UserChannel } from './user-channel.entity';

describe('YouTubeChannel Entity', () => {
  let youtubeChannel: YouTubeChannel;

  beforeEach(() => {
    youtubeChannel = new YouTubeChannel();
    youtubeChannel.id = 'channel-123';
    youtubeChannel.channelId = 'UC1234567890';
    youtubeChannel.channelName = 'Test Channel';
    youtubeChannel.snapshots = [];
    youtubeChannel.userChannels = [];
  });

  it('should be defined', () => {
    expect(youtubeChannel).toBeDefined();
  });

  it('should have correct properties', () => {
    expect(youtubeChannel.id).toBe('channel-123');
    expect(youtubeChannel.channelId).toBe('UC1234567890');
    expect(youtubeChannel.channelName).toBe('Test Channel');
    expect(youtubeChannel.snapshots).toEqual([]);
    expect(youtubeChannel.userChannels).toEqual([]);
  });

  it('should have userChannels array', () => {
    const uc = new UserChannel();
    youtubeChannel.userChannels = [uc];

    expect(youtubeChannel.userChannels).toHaveLength(1);
    expect(youtubeChannel.userChannels[0]).toBeInstanceOf(UserChannel);
  });

  it('should have snapshots array', () => {
    const snapshot = new ChannelSnapshot();
    snapshot.id = 'snapshot-123';
    youtubeChannel.snapshots = [snapshot];

    expect(youtubeChannel.snapshots).toHaveLength(1);
    expect(youtubeChannel.snapshots[0]).toBeInstanceOf(ChannelSnapshot);
  });
});
