export interface TermsResponse {
  id: string,
  version: number,
  html: string,
  createdAt: string
} 

export interface AcceptTermsResponse {
  success: boolean,
  message: string,
  acceptedVersion: number,
  acceptedAt: string
} 

export interface CountryMarketData {
  iso3Code: string;
  iso2Code: string;
  name: string;
  creditCardPenetration: number;
  mobilePenetration: number;
}

export interface CountryViewerData {
  countryCode: string;
  countryName: string;
  flagEmoji: string;
  flag: string;
  viewersInSponspayCountry: number;
  creditCardMarketShare: number;
  mobileSimCardMarketShare: number;
}

export interface PaymentAccessCalculation {
  country: CountryViewerData;
  avgTotalViewersWithYouTubeAccess: number;
  avgAdditionalViewersWithPaymentAccess: number;
  avgTotalViewersWithPaymentAccess: number;
}

export interface CreatorSignInBody {
  displayName: string,
  email: string,
  firebaseUid?: string,
  googleUserId?: string,
  profilePictureUrl?: string,
  locale?: string,
  signInContext?: string
}

export interface CreatorSignInResponse {
  success: boolean,
  message: string,
  userId?: string,
  isCreator: boolean,
  isCoAdmin: boolean,
  hasAcceptedTerms: boolean,
  youtubeConnected?: boolean
}

export interface OnboardCreatorBody {
  youtubeChannelId: string,
  telegramHandle: string,
  youtubePayingUsersPercentage: number,
  sponspayPayingUsersPercentage: number
}

export interface OnboardCreatorResponse {
  success: boolean,
  message: string,
  isCreator: boolean,
  isCoAdmin: boolean,
  hasAcceptedTerms: boolean,
  data: {
    userId: string,
    youtubeChannelId: string,
    telegramChannelHandle: string,
    role: string
  }
}
export interface CancelOnboardingBody {
  reason: string,
  wantsUpdates: boolean,
}

export interface ChannelAvailabilityBody {
  handles: string[]
}
export interface ChannelAvailabilityResponse {
  taken: string[]
}

export interface CancelOnboarding {
  keepMeUpdated: boolean,
  reason: string,
}

export interface ChannelInviteResponse {
  channelHandle: string;
  inviteLink: string | null;
  channelId: string;
  qr?: string;
  coAdminAdded: boolean;
}

export interface CoAdminStatusResponse {
  coAdminAdded: boolean;
  channelHandle: string;
  channelId: string;
  lastChecked: string;
}
