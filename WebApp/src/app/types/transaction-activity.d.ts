import { LatestTransaction } from '@app-types/transaction-activity';
export interface LatestTransactionResponse {
  startDate?: string;
  endDate?: string;
  totalRecords: number;
  page: number;
  limit: number;
  items: LatestTransaction[];
  availableCountries: TransactionCountryList[];
}

export interface TransactionCountryList {
  countryCode: string;
  countryName: string;
  img?: string;
  currencies: string[];
}

export interface LatestTransaction {
  messageId: string;
  messageContent: string;
  createdAt: string;
  country: string;
  countryCode: string;
  flag?: string;
  localAmount: number;
  localCurrencyCode: string;
  referralSource: string;
  referralMedium: string;
  revenueStatus: TRANSACTION_REVENUE_STATUS;
  multiplier: number;
  replyDeadline: string;
  senderName: string | null;
  telegramMessageLink: string | null;
}

export interface TransactionFilter {
  country?: string[] | null;
  status?: string[] | null;
  dateRange?: number | null;
  sortBy?: string | null;
  sortOrder?: string | null;
  canceled?: boolean | null;
}

export interface TransactionFilterParams {
  startDate?: string | null;
  endDate?: string | null;
  amountGte?: number | null;
  amountLte?: number | null;
  countries?: string[] | null;
  revenueStatuses?: string[] | null;
  operator?: string | null;
  search?: string | null;
  sortBy: string | null;
  sortOrder: string | null;
  channelId: string;
  page: number;
  limit: number;
}

export interface MessageUnitStatistics {
  current30Days: {
    totalUsd: number;
    averageUsd: number;
    transactionCount: number;
  };
  previous30Days: {
    totalUsd: number;
    averageUsd: number;
    transactionCount: number;
  };
  changePercentage: number | null;
  monthlyAverages: TransactionMonthlyAverage[];
  topCountries: {
    countryCode: string;
    countryName: string;
    flag?: string;
    totalUsd: number;
  }[];
}

interface TransactionMonthlyAverage {
  month: string;
  averagePerDayUsd: number;
}