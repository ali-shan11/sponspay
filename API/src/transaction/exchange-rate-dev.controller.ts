import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ExchangeRateService } from './services/exchange-rate.service';
import { NonProdGuard } from '../admin/guards/non-prod.guard';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { ConvertCurrencyDto } from './dto/convert-currency.dto';
import { ExchangeRateResponseDto } from './dto/exchange-rate-response.dto';

@ApiTags('transaction')
@Controller('transaction/dev')
@UseGuards(NonProdGuard, ApiKeyGuard)
@ApiSecurity('apiKey')
export class ExchangeRateDevController {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  @Post('convert-currency')
  @ApiOperation({
    summary: 'Dev: Convert currency using ExchangeRate API',
    description:
      'Converts an amount from one currency to another using exchangerate-api.com. ' +
      'Target currency defaults to USD if not provided. ' +
      'Non-production only: this endpoint is blocked in production by guard.',
  })
  @ApiResponse({
    status: 201,
    description: 'Currency conversion successful',
    type: ExchangeRateResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid currency code or malformed request. Currency codes must be valid ISO 4217 codes.',
  })
  @ApiUnauthorizedResponse({
    description:
      'Invalid API key or inactive ExchangeRate API account. Check your EXCHANGE_RATE_API_KEY configuration.',
  })
  @ApiForbiddenResponse({
    description: 'This endpoint is disabled in production environments.',
  })
  @ApiServiceUnavailableResponse({
    description:
      'ExchangeRate API is unavailable, quota reached, or server error. Try again later.',
  })
  async convertCurrency(
    @Body() dto: ConvertCurrencyDto,
  ): Promise<ExchangeRateResponseDto> {
    const targetCurrency = dto.to ?? 'USD';
    return this.exchangeRateService.convertCurrency(
      dto.from,
      targetCurrency,
      dto.amount,
    );
  }
}
