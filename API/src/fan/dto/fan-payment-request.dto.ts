import {
  IsString,
  IsNotEmpty,
  IsPhoneNumber,
  MaxLength,
  MinLength,
  Length,
  IsEnum,
  IsInt,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  IsOptional,
  Matches,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../../transaction/entities/message-type.enum';

@ValidatorConstraint({ name: 'isValidPriceMultiple', async: false })
export class IsValidPriceMultiple implements ValidatorConstraintInterface {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validate(value: number, _args: ValidationArguments): boolean {
    return Number.isInteger(value) && value >= 1 && value <= 100;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  defaultMessage(_args: ValidationArguments): string {
    return 'Price multiple must be an integer between 1 and 100';
  }
}

@ValidatorConstraint({ name: 'noHtmlTags', async: false })
export class NoHtmlTags implements ValidatorConstraintInterface {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validate(value: string, _args: ValidationArguments): boolean {
    // Reject messages containing HTML tags or script content
    const htmlTagPattern = /<[^>]*>/g;
    const scriptPattern = /<script[\s\S]*?<\/script>/gi;

    return !htmlTagPattern.test(value) && !scriptPattern.test(value);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  defaultMessage(_args: ValidationArguments): string {
    return 'Message content cannot contain HTML tags or scripts';
  }
}

export class FanPaymentRequestDto {
  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({
    description:
      'Client-generated UUID idempotency key. Must be unique per payment intent. ' +
      'If the same key is sent while a previous payment with that key is still active ' +
      '(pending/processing/succeeded), the server returns the existing transaction ' +
      'without creating a duplicate. Generate a new key for each new payment intent.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  idempotencyKey: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  @Validate(NoHtmlTags)
  @ApiProperty({
    description: 'Message from fan to creator (no HTML tags allowed)',
    example: 'Love your content! Keep it up!',
    maxLength: 1000,
  })
  messageContent: string;

  @ApiPropertyOptional({
    description:
      'Optional subject/title for the message.\n\n' +
      '**Testing Auto-Refund (Non-Production Only):**\n' +
      'In development and test environments, use subject "Refund me" (case-insensitive) to trigger a simulated message delivery failure. ' +
      'This will test the complete auto-refund flow including:\n' +
      '- Multiple retry attempts with exponential backoff\n' +
      '- Transaction status updates\n' +
      '- PawaPay refund creation\n' +
      '- Management email alerts\n' +
      '- Fan WebSocket notifications\n\n' +
      '**Testing Payment Timeout (Non-Production Only):**\n' +
      'Use subject "Delay me" (case-insensitive) to simulate a slow payment provider. ' +
      'Delays WebSocket events by TEST_DELAY_SECONDS env var (defaults to 720s / 12 min), ' +
      'allowing you to test the client-side 10-minute countdown timer and timeout UI.\n\n' +
      'Both test triggers are disabled in production environments for safety.',
    example: 'Thank you for the great stream!',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Validate(NoHtmlTags)
  subject?: string;

  @IsOptional()
  @IsEnum(MessageType)
  @ApiPropertyOptional({
    description:
      'Type of content the fan is commenting on. Optional — defaults to Video when omitted (e.g. channels with no videos/livestreams).',
    enum: MessageType,
    example: MessageType.Livestream,
  })
  messageType?: MessageType;

  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(100)
  @ApiProperty({
    description: 'Fan display name',
    example: 'John Doe',
  })
  payerFullName: string;

  @IsPhoneNumber()
  @ApiProperty({
    description: 'Fan phone number in international format',
    example: '+260971234567',
  })
  payerPhone: string;

  @IsInt()
  @Validate(IsValidPriceMultiple)
  @ApiProperty({
    description:
      'Multiple of the base price (1-100x). The actual payment amount is calculated as: base price × multiple. ' +
      "Note: The maximum multiple is further constrained by the selected payment operator's limits. " +
      'The effective maximum is calculated as floor(operatorMaxLimit / operatorMinLimit), capped at 100.',
    example: 5,
    minimum: 1,
    maximum: 100,
  })
  priceMultiple: number;

  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  @ApiProperty({
    description: 'ISO 4217 currency code',
    example: 'ZMW',
  })
  currency: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Payment provider correspondent',
    example: 'MTN_MOMO_ZMB',
  })
  correspondent: string;

  @ApiPropertyOptional({
    description: 'Referral source (e.g., "facebook", "instagram", "email")',
    example: 'facebook',
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Matches(/^[a-zA-Z0-9_\-. ]+$/, {
    message:
      'Referral source can only contain letters, numbers, spaces, hyphens, underscores, and periods',
  })
  referralSource?: string;

  @ApiPropertyOptional({
    description: 'Referral medium (e.g., "social", "cpc", "email")',
    example: 'social',
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Matches(/^[a-zA-Z0-9_\-. ]+$/, {
    message:
      'Referral medium can only contain letters, numbers, spaces, hyphens, underscores, and periods',
  })
  referralMedium?: string;

  @ApiPropertyOptional({
    description: 'Referral campaign (e.g., "summer_promo", "launch_2025")',
    example: 'summer_promo',
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Matches(/^[a-zA-Z0-9_\-. ]+$/, {
    message:
      'Referral campaign can only contain letters, numbers, spaces, hyphens, underscores, and periods',
  })
  referralCampaign?: string;

  @ApiPropertyOptional({
    description:
      'YouTube video/livestream URL (optional, for thank-you messages)',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  youtubeUrl?: string;

  @ApiPropertyOptional({
    description:
      'YouTube live chat ID (for livestreams, extracted from page context)',
    example: 'Cg0KCzEyMzQ1Njc4OTAw',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  youtubeLiveChatId?: string;
}
