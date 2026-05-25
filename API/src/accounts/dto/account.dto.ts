export class AccountDto {
  id: string;
  phoneNumber: string;
  fullName: string;
  nickname: string | null;
  providerName: string;
  country: string;
  isVerified: boolean;
  verifiedAt: Date | null;
}
