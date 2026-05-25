export interface PaymentOverviewObj {
  country: { name: string; icon: string };
  currency: string;
  totalEarning: { amount: number; percentage: string };
  totalMessage: { amount: number; icon: string };
  nextPayAmount: number;
  nextPayDate: string;
  payDeadline: null | string;
  compensation: number;
}

export interface CompensationPayoutObj {
  dateTime: string;
  txnId: string;
  beneficiary: { number: string; name: string };
  payoutMethod: string;
  amountSent: { amount: number; percentage: string };
  currency: string;
  status: 'pending' | 'failed' | 'completed';
  invoiceRef: string;
}

export interface MessageObj {
  userName: string;
  message: string;
  date: string;
}

export interface RevenuePerDayResponse {
  days: number;
  timezoneOffsetMinutes: number;
  startDate: string;
  endDate: string;
  series: RevenueSeries[];
  totalRevenueUsd: number;
  trendPercentage: number | null;
}

export interface RevenueSeries {
  date: string;
  revenueUsd: number;
}

export interface TopEarningCountryItem {
  country: string;
  countryCode: string;
  flag: string;
  currency: {
    code: string;
    iso4217Numeric: number;
  };
  localAmountTotal: number;
  usdTotal: number;
}

export interface TopEarningCountriesResponse {
  days: number;
  timezoneOffsetMinutes: number;
  startDate: string;
  endDate: string;
  limit: number;
  totalUsd: number;
  exchangeRatesApplied: boolean;
  items: TopEarningCountryItem[];
}

export interface ChannelStatisticsResponse {
  channelHandle: string | null,
  linkClicks: number,
  transactions: number,
  transactionTrend: number | null
}

export interface TransactionsResponse {
  days: number,
  startDate: string,
  endDate: string,
  page: number,
  limit: number,
  items: PaymentTransaction[]
}

export interface PaymentTransaction {
  country: string,
  countryCode: string,
  flag?: string,
  localAmount: number,
  localCurrencyCode: string,
  usdEstimatedValue: number,
  paidMessagesCount: number,
  payoutLocal: number,
  payoutDate: string | null,
  payDeadline: string | null
}

export interface PaymentOverviewItem {
  countryCode: string,
  flag?: string,
  localCurrencyCode: string,
  hasAccount: boolean,
  totalLocal: number,
  totalUsd: number,
  nextPayAmountLocal: number | null,
  nextPayAmountUsd: number | null,
  nextPayDate: string | null,
  premiumMessages: number,
  livestreamMessages: number,
  videoMessages: number,
  mobileNumber: string | null,
  livestreamTotalLocal: number,
  livestreamTotalUsd: number,
  videoTotalLocal: number,
  videoTotalUsd: number,
  uniqueLivestreams: number,
  averageMessageValue: number,
  totalFees: number,
  averageFee: number,
  feePercentage: number,
}

export interface PaymentOverviewResponse {
  days: number,
  items: PaymentOverviewItem[]
}

export interface CreatorYoutubeChannel {
  id: string,
  youtubeChannelId: string,
  channelName: string,
  telegramHandle: string,
  role: string,
  createdAt: string
}