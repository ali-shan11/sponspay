import { AccountDto } from './account.dto';

export class CreateAccountResponseDto {
  account: AccountDto;
  message?: string;
  alreadyExists?: boolean;
}
