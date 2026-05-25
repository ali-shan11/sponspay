import { ChannelInfo, ChannelSelectionResult } from "@app-types/youtube-analytics";

/**
 * Pre-defined mock channels for consistent testing scenarios
 */
export const mockChannels = {
  /**
   * Small channel owned by user (under 250 subscribers)
   */
  smallOwnedChannel: {
    id: 'UC123456789ABCDEF',
    title: 'Small Creator Channel',
    thumbnail: 'https://yt3.ggpht.com/a/small-channel-thumb.jpg',
    role: 'owner' as const,
    subscriberCount: 150
  } as ChannelInfo,

  /**
   * Medium channel owned by user (250+ subscribers)
   */
  mediumOwnedChannel: {
    id: 'UC987654321FEDCBA',
    title: 'Medium Creator Channel',
    thumbnail: 'https://yt3.ggpht.com/a/medium-channel-thumb.jpg',
    role: 'owner' as const,
    subscriberCount: 1250
  } as ChannelInfo,

  /**
   * Large channel owned by user (10K+ subscribers)
   */
  largeOwnedChannel: {
    id: 'UCABCDEF123456789',
    title: 'Popular Creator Channel',
    thumbnail: 'https://yt3.ggpht.com/a/large-channel-thumb.jpg',
    role: 'owner' as const,
    subscriberCount: 15750
  } as ChannelInfo,

  /**
   * Mega channel owned by user (100K+ subscribers)
   */
  megaOwnedChannel: {
    id: 'UCFEDCBA987654321',
    title: 'Mega Creator Channel',
    thumbnail: 'https://yt3.ggpht.com/a/mega-channel-thumb.jpg',
    role: 'owner' as const,
    subscriberCount: 250000
  } as ChannelInfo,

  /**
   * Channel managed by user (editor role)
   */
  managedChannel: {
    id: 'UC555666777888999',
    title: 'Managed Brand Channel',
    thumbnail: 'https://yt3.ggpht.com/a/managed-channel-thumb.jpg',
    role: 'editor' as const,
    subscriberCount: 50000
  } as ChannelInfo,

  /**
   * Channel without subscriber count (privacy settings)
   */
  privateStatsChannel: {
    id: 'UC111222333444555',
    title: 'Private Stats Channel',
    thumbnail: 'https://yt3.ggpht.com/a/private-channel-thumb.jpg',
    role: 'owner' as const,
    subscriberCount: undefined
  } as ChannelInfo,

  /**
   * Channel with very long title (edge case)
   */
  longTitleChannel: {
    id: 'UC999888777666555',
    title: 'This is a Very Long Channel Title That Might Cause Layout Issues in the UI Components When Displayed',
    thumbnail: 'https://yt3.ggpht.com/a/long-title-channel-thumb.jpg',
    role: 'owner' as const,
    subscriberCount: 5000
  } as ChannelInfo,

  /**
   * Channel with special characters in title
   */
  specialCharsChannel: {
    id: 'UC444333222111000',
    title: 'Gaming & Tech Reviews 🎮💻 [Official]',
    thumbnail: 'https://yt3.ggpht.com/a/special-chars-channel-thumb.jpg',
    role: 'owner' as const,
    subscriberCount: 8500
  } as ChannelInfo
};

/**
 * Mock channel selection results for multi-channel scenarios
 */
export const mockChannelSelections = {
  /**
   * Single channel selection (user owns only one channel)
   */
  singleChannel: {
    selectedChannel: mockChannels.mediumOwnedChannel,
    allChannels: [mockChannels.mediumOwnedChannel]
  } as ChannelSelectionResult,

  /**
   * Multi-channel selection (user owns multiple channels)
   */
  multipleChannels: {
    selectedChannel: mockChannels.largeOwnedChannel,
    allChannels: [
      mockChannels.smallOwnedChannel,
      mockChannels.mediumOwnedChannel,
      mockChannels.largeOwnedChannel,
      mockChannels.managedChannel
    ]
  } as ChannelSelectionResult,

  /**
   * Mixed ownership selection (owned + managed channels)
   */
  mixedOwnership: {
    selectedChannel: mockChannels.megaOwnedChannel,
    allChannels: [
      mockChannels.megaOwnedChannel,
      mockChannels.managedChannel,
      mockChannels.privateStatsChannel
    ]
  } as ChannelSelectionResult,

  /**
   * Edge case selection (channels with special properties)
   */
  edgeCases: {
    selectedChannel: mockChannels.longTitleChannel,
    allChannels: [
      mockChannels.longTitleChannel,
      mockChannels.specialCharsChannel,
      mockChannels.privateStatsChannel
    ]
  } as ChannelSelectionResult
};

/**
 * Mock YouTube API response data for channel listing
 */
export const mockYouTubeApiResponses = {
  /**
   * Single owned channel response
   */
  singleOwnedChannel: {
    kind: 'youtube#channelListResponse',
    etag: 'mock-etag-single',
    pageInfo: {
      totalResults: 1,
      resultsPerPage: 50
    },
    items: [
      {
        kind: 'youtube#channel',
        etag: 'mock-channel-etag-1',
        id: mockChannels.mediumOwnedChannel.id,
        snippet: {
          title: mockChannels.mediumOwnedChannel.title,
          description: 'A growing YouTube channel focused on creative content',
          thumbnails: {
            default: {
              url: mockChannels.mediumOwnedChannel.thumbnail,
              width: 88,
              height: 88
            },
            medium: {
              url: mockChannels.mediumOwnedChannel.thumbnail.replace('.jpg', '_medium.jpg'),
              width: 240,
              height: 240
            },
            high: {
              url: mockChannels.mediumOwnedChannel.thumbnail.replace('.jpg', '_high.jpg'),
              width: 800,
              height: 800
            }
          }
        },
        statistics: {
          viewCount: '125000',
          subscriberCount: '1250',
          hiddenSubscriberCount: false,
          videoCount: '45'
        }
      }
    ]
  },

  /**
   * Multiple channels response (owned + managed)
   */
  multipleChannels: {
    kind: 'youtube#channelListResponse',
    etag: 'mock-etag-multiple',
    pageInfo: {
      totalResults: 4,
      resultsPerPage: 50
    },
    items: [
      {
        kind: 'youtube#channel',
        etag: 'mock-channel-etag-2',
        id: mockChannels.smallOwnedChannel.id,
        snippet: {
          title: mockChannels.smallOwnedChannel.title,
          description: 'A small but growing YouTube channel',
          thumbnails: {
            default: {
              url: mockChannels.smallOwnedChannel.thumbnail,
              width: 88,
              height: 88
            }
          }
        },
        statistics: {
          viewCount: '15000',
          subscriberCount: '150',
          hiddenSubscriberCount: false,
          videoCount: '12'
        }
      },
      {
        kind: 'youtube#channel',
        etag: 'mock-channel-etag-3',
        id: mockChannels.largeOwnedChannel.id,
        snippet: {
          title: mockChannels.largeOwnedChannel.title,
          description: 'A popular YouTube channel with engaged audience',
          thumbnails: {
            default: {
              url: mockChannels.largeOwnedChannel.thumbnail,
              width: 88,
              height: 88
            }
          }
        },
        statistics: {
          viewCount: '2500000',
          subscriberCount: '15750',
          hiddenSubscriberCount: false,
          videoCount: '180'
        }
      },
      {
        kind: 'youtube#channel',
        etag: 'mock-channel-etag-4',
        id: mockChannels.managedChannel.id,
        snippet: {
          title: mockChannels.managedChannel.title,
          description: 'A brand channel managed by the user',
          thumbnails: {
            default: {
              url: mockChannels.managedChannel.thumbnail,
              width: 88,
              height: 88
            }
          }
        },
        statistics: {
          viewCount: '5000000',
          subscriberCount: '50000',
          hiddenSubscriberCount: false,
          videoCount: '250'
        }
      }
    ]
  },

  /**
   * Empty response (no channels found)
   */
  noChannels: {
    kind: 'youtube#channelListResponse',
    etag: 'mock-etag-empty',
    pageInfo: {
      totalResults: 0,
      resultsPerPage: 50
    },
    items: []
  }
};

// Factory Functions

/**
 * Create a custom mock channel with specific properties
 */
export function createMockChannel(overrides?: Partial<ChannelInfo>): ChannelInfo {
  const baseChannel = mockChannels.mediumOwnedChannel;
  return { ...baseChannel, ...overrides };
}

/**
 * Create a list of mock channels with specified count
 */
export function createMockChannelList(count: number, baseChannel?: Partial<ChannelInfo>): ChannelInfo[] {
  const channels: ChannelInfo[] = [];
  
  for (let i = 0; i < count; i++) {
    const channel = createMockChannel({
      id: `UC${String(i).padStart(16, '0')}`,
      title: `Test Channel ${i + 1}`,
      thumbnail: `https://yt3.ggpht.com/a/test-channel-${i + 1}-thumb.jpg`,
      subscriberCount: Math.floor(Math.random() * 100000),
      ...baseChannel
    });
    channels.push(channel);
  }
  
  return channels;
}

/**
 * Create a mock channel with specific subscriber count
 */
export function createMockChannelWithSubscribers(subscriberCount: number, role: 'owner' | 'editor' = 'owner'): ChannelInfo {
  const formattedCount = subscriberCount;
  
  return createMockChannel({
    id: `UC${subscriberCount.toString().padStart(16, '0')}`,
    title: `Channel with ${formattedCount} Subscribers`,
    thumbnail: `https://yt3.ggpht.com/a/channel-${subscriberCount}-subs.jpg`,
    role,
    subscriberCount: formattedCount
  });
}

/**
 * Create a mock channel selection result
 */
export function createMockChannelSelection(
  selectedChannel: ChannelInfo,
  allChannels: ChannelInfo[]
): ChannelSelectionResult {
  return {
    selectedChannel,
    allChannels
  };
}

/**
 * Create mock channels for subscriber threshold testing
 */
export function createSubscriberThresholdChannels() {
  return {
    belowThreshold: createMockChannelWithSubscribers(150), // Below 250
    atThreshold: createMockChannelWithSubscribers(250), // Exactly 250
    aboveThreshold: createMockChannelWithSubscribers(1000), // Above 250
    wayAboveThreshold: createMockChannelWithSubscribers(50000) // Well above 250
  };
}

/**
 * Create mock channels for different roles testing
 */
export function createRoleBasedChannels() {
  return {
    ownedSmall: createMockChannelWithSubscribers(100, 'owner'),
    ownedLarge: createMockChannelWithSubscribers(5000, 'owner'),
    managedSmall: createMockChannelWithSubscribers(200, 'editor'),
    managedLarge: createMockChannelWithSubscribers(10000, 'editor')
  };
}
