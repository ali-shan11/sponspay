import { IsString, Length, Matches } from 'class-validator';

export class VerifyAccountDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^[0-9]+$/)
  code: string;
}
