export interface LandingPageDetailResponse {
  totalRevenue: number;
  growth: number;
  countriesSupported: number;
  transactions: number;
  users: {
    avatar: string;
  } [];
}

export interface MarketingNewsResponse {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string;
}
