import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @ValidateIf((o) => o.nickname !== null)
  @IsString()
  nickname?: string | null;
}
