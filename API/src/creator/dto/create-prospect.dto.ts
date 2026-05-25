import { IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProspectDto {
  @IsString()
  displayName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  googleUserId?: string;

  @ApiProperty({
    description:
      'Firebase UID of the user. If provided, skips Firebase lookup for better performance. Falls back to googleUserId lookup if not provided.',
    required: false,
  })
  @IsOptional()
  @IsString()
  firebaseUid?: string;

  @IsOptional()
  @IsString()
  profilePictureUrl?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsString()
  signInContext?: string;
}
