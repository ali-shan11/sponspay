import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Max,
  Min,
  IsString,
  IsNumber,
  IsArray,
  IsIn,
  ArrayMinSize,
  ArrayMaxSize,
  Matches,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@ValidatorConstraint({ name: 'isBeforeOrEqual', async: false })
class IsBeforeOrEqualConstraint implements ValidatorConstraintInterface {
  validate(startDate: any, args: ValidationArguments) {
    const obj = args.object as any;
    if (!startDate || !obj.endDate) {
      return true;
    }
    return new Date(startDate) <= new Date(obj.endDate);
  }

  defaultMessage() {
    return 'startDate must be before or equal to endDate';
  }
}

@ValidatorConstraint({ name: 'isLessThanOrEqual', async: false })
class IsLessThanOrEqualConstraint implements ValidatorConstraintInterface {
  validate(amountGte: any, args: ValidationArguments) {
    const obj = args.object as any;
    if (amountGte === undefined || obj.amountLte === undefined) {
      return true;
    }
    return Number(amountGte) <= Number(obj.amountLte);
  }

  defaultMessage() {
    return 'amountGte must be less than or equal to amountLte';
  }
}

export class TransactionsQueryDto {
  @ApiProperty({
    description: 'YouTube channel ID (UUID) to scope transactions',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty()
  @IsUUID()
  channelId: string;

  @ApiPropertyOptional({
    description:
      'Start date (inclusive, YYYY-MM-DD format in UTC). Defaults to 30 days ago.',
    example: '2025-01-01',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate must be in YYYY-MM-DD format',
  })
  @Validate(IsBeforeOrEqualConstraint)
  startDate?: string;

  @ApiPropertyOptional({
    description:
      'End date (inclusive, YYYY-MM-DD format in UTC). Defaults to today.',
    example: '2025-01-31',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate must be in YYYY-MM-DD format',
  })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Minimum amount (greater than or equal)',
    example: 10.0,
    minimum: 0,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Validate(IsLessThanOrEqualConstraint)
  amountGte?: number;

  @ApiPropertyOptional({
    description: 'Maximum amount (less than or equal)',
    example: 100.0,
    minimum: 0,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amountLte?: number;

  @ApiPropertyOptional({
    description: 'Filter by country codes (ISO 3166-1 alpha-3)',
    example: ['KEN', 'ZMB', 'TZA'],
    type: [String],
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Matches(/^[A-Z]{3}$/, {
    each: true,
    message:
      'Each country code must be 3 uppercase letters (ISO 3166-1 alpha-3)',
  })
  countries?: string[];

  @ApiPropertyOptional({
    description: 'Filter by currency codes (ISO 4217)',
    example: ['KES', 'ZMW', 'USD'],
    type: [String],
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Matches(/^[A-Z]{3}$/, {
    each: true,
    message: 'Each currency code must be 3 uppercase letters (ISO 4217)',
  })
  currencies?: string[];

  @ApiPropertyOptional({
    description: 'Filter by revenue statuses',
    example: ['awaiting-reply', 'earned'],
    type: [String],
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsIn(['awaiting-reply', 'earned', 'auto-replied'], { each: true })
  revenueStatuses?: string[];

  @ApiPropertyOptional({
    description:
      'Filter by payment operator/correspondent (e.g., MTN_MOMO_ZMB)',
    example: 'MTN_MOMO_ZMB',
  })
  @IsOptional()
  @IsString()
  operator?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ['amount', 'createdAt', 'country', 'revenueStatus', 'multiplier'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['amount', 'createdAt', 'country', 'revenueStatus', 'multiplier'])
  sortBy?: 'amount' | 'createdAt' | 'country' | 'revenueStatus' | 'multiplier';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
    default: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of records per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description:
      'Free-text search across country name, country code, message content, amount, and date',
    example: 'Kenya',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
