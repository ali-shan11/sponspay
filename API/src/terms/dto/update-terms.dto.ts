import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateTermsDto {
  @IsString()
  @IsNotEmpty()
  html: string;
}
