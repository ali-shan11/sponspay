export interface YouTubeAnalyticsChannelQueryResponse {
  kind: "youtube#channelListResponse",
  etag: etag,
  nextPageToken: string,
  prevPageToken: string,
  pageInfo: {
    totalResults: number,
    resultsPerPage: number
  },
  items: YoutubeChannel[]
}

// YouTube Analytics API Response Interfaces
// These are for the Analytics API (youtubeanalytics.googleapis.com/v2/reports)
export interface YouTubeAnalyticsReportResponse {
  kind: "youtubeAnalytics#resultTable";
  columnHeaders: YouTubeAnalyticsColumnHeader[];
  rows: (string | number)[][];
}

export interface YouTubeAnalyticsColumnHeader {
  name: string;
  columnType: "DIMENSION" | "METRIC";
  dataType: "STRING" | "INTEGER" | "FLOAT";
}

export interface YoutubeChannel {
  kind: "youtube#channel",
  etag: etag,
  id: string,
  snippet: {
    title: string,
    description: string,
    customUrl: string,
    publishedAt: datetime,
    thumbnails: {
      default?: {
        url: string,
        width: number,
        height: number
      },
      medium?: {
        url: string,
        width: number,
        height: number
      },
      high?: {
        url: string,
        width: number,
        height: number
      }
    },
    defaultLanguage: string,
    localized: {
      title: string,
      description: string
    },
    country: string
  },
  contentDetails: {
    relatedPlaylists: {
      likes: string,
      favorites: string,
      uploads: string
    }
  },
  statistics: {
    viewCount: string,  // unsigned long returned as string in JSON
    subscriberCount: string,  // unsigned long returned as string in JSON, rounded to three significant figures
    hiddenSubscriberCount: boolean,
    videoCount: string  // unsigned long returned as string in JSON
  },
  topicDetails: {
    topicIds: [
      string
    ],
    topicCategories: [
      string
    ]
  },
  status: {
    privacyStatus: string,
    isLinked: boolean,
    longUploadsStatus: string,
    madeForKids: boolean,
    selfDeclaredMadeForKids: boolean
  },
  brandingSettings: {
    channel: {
      title: string,
      description: string,
      keywords: string,
      trackingAnalyticsAccountId: string,
      unsubscribedTrailer: string,
      defaultLanguage: string,
      country: string
    },
    watch: {
      textColor: string,
      backgroundColor: string,
      featuredPlaylistId: string
    }
  },
  auditDetails: {
    overallGoodStanding: boolean,
    communityGuidelinesGoodStanding: boolean,
    copyrightStrikesGoodStanding: boolean,
    contentIdClaimsGoodStanding: boolean
  },
  contentOwnerDetails: {
    contentOwner: string,
    timeLinked: datetime
  },
  localizations: (key) => {
      title: string,
      description: string
    }
}

export interface ChannelInfo {
  id: string;
  title: string;
  thumbnail: string;
  role: 'owner' | 'editor';
  subscriberCount?: number;
}

export interface ChannelSelectionResult {
  selectedChannel: ChannelInfo;
  allChannels: ChannelInfo[];
}

// YouTube API Error Response Interfaces
// Based on Google API standard error format and Angular HttpClient wrapping

/**
 * Angular HttpClient error wrapper for YouTube API errors
 * This is what gets caught in the catch blocks
 */
export interface YouTubeAPIErrorResponse {
  error: YouTubeAPIError;
  status?: number;
  statusText?: string;
  url?: string;
}

/**
 * Standard Google API error structure
 * Based on YouTube Data API v3 error documentation
 */
export interface YouTubeAPIError {
  error: YouTubeAPIErrorDetail;
}

/**
 * Detailed error information from YouTube API
 */
export interface YouTubeAPIErrorDetail {
  code: number;
  message: string;
  errors?: YouTubeAPIErrorItem[];
  status?: string;
}

/**
 * Individual error item within the errors array
 */
export interface YouTubeAPIErrorItem {
  message: string;
  domain: string;
  reason: string;
  location?: string;
  locationType?: string;
}

/**
 * Common YouTube API error types based on official documentation
 */
export type YouTubeAPIErrorType = 
  | 'badRequest'
  | 'forbidden' 
  | 'notFound'
  | 'quotaExceeded'
  | 'unauthorized'
  | 'tooManyRequests'
  | 'conflict'
  | 'invalidValue'
  | 'required';

/**
 * Common YouTube API error reasons based on official documentation
 */
export type YouTubeAPIErrorReason =
  | 'incompatibleParameters'
  | 'invalidFilters'
  | 'invalidPageToken'
  | 'missingRequiredParameter'
  | 'unexpectedParameter'
  | 'accountDelegationForbidden'
  | 'authenticatedUserAccountClosed'
  | 'authenticatedUserAccountSuspended'
  | 'authenticatedUserNotChannel'
  | 'channelClosed'
  | 'channelNotFound'
  | 'channelSuspended'
  | 'insufficientPermissions'
  | 'contentOwnerAccountNotFound'
  | 'authorizationRequired'
  | 'youtubeSignupRequired'
  | 'forbidden'
  | 'quotaExceeded';
