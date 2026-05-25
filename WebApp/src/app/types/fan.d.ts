import { FAN_MESSAGE_TYPE } from "@utils/enums";

export interface FanChannelInfo {
  channelHandle: string;
  creatorName: string;
  youtubeEmbed: {
    channelName: string;
    embedUrl: string;
    isLiveStream: boolean;
    title: string;
    description: string;
    thumbnailUrl: string;
  } | null;
  recentMessages: RecentComment[];
  paymentsAvailable: boolean;
  inviteLink: string;
  qr: string;
  paymentCountries: FanCountry[];
}

export interface FanCountry {
  countryCode: string;
  countryName: string;
  currency: string;
  img: string;
  operators: FanOperator[];
}

export interface FanOperator {
  name: string;
  displayName: string;
  status: string;
  price: number;
  // minPrice: number;
  // maxPrice: number;
  maxMultiple: number;
  disabled?: boolean;
}

export interface RecentComment {
  payerFullName: string;
  content: string;
  timestamp: string;
  senderType?: 'creator' | 'paid';
  isNew?: boolean;
  telegramMessageId?: string | null;
  replyToMessageId?: string | null;
  subject?: string | null;
  amount?: string | null;
  youtubeVideoId?: string | null;
  youtubeVideoTitle?: string | null;
}

export interface FanPayment {
  depositId: string;
  fanSessionId: string;
  transactionId: string;
  status: string;
  channelHandle: string;
}

// export interface CountryCurrency {
//   price: number;
//   currencyCode: string;
//   currencyName: string;
//   exchangeRate: number;
//   lastUpdated: string;
//   basePriceUSD: number;
// }

export interface PredictProviderResponse {
  country: string;
  provider: string;
  phoneNumber: string;
}

export interface SendFanPaymentBody {
  idempotencyKey: string;
  subject?: string;
  messageContent: string;
  messageType?: FAN_MESSAGE_TYPE;
  payerFullName: string;
  payerPhone: string;
  priceMultiple: number;
  currency: string;
  correspondent: string;
  referralSource?: string;
  referralMedium?: string;
  referralCampaign?: string;
  youtubeUrl?: string;
  youtubeLiveChatId?: string;
}
