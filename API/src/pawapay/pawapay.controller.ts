import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { randomUUID } from 'crypto';
import { PawapayService } from './pawapay.service';
import { PawapayWebhookService } from './pawapay-webhook.service';
import { PawapayCallback } from './interfaces/pawapay.interfaces';
import { PawapayRequestException } from './pawapay.exceptions';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { NonProdGuard } from '../admin/guards/non-prod.guard';
import { TestDepositDto } from './dto/test-deposit.dto';
import { TestPayoutDto } from './dto/test-payout.dto';
import { TestRefundDto } from './dto/test-refund.dto';
import { PawapayAvailabilityQueryDto } from './dto/pawapay-availability-query.dto';
import { PawapayProviderAvailabilityDto } from './dto/pawapay-provider-availability.dto';
import {
  PredictProviderDto,
  PredictProviderResponseDto,
} from './dto/predict-provider.dto';

// Custom interface for requests with raw body
interface RawBodyRequest extends Request {
  rawBody?: string | Buffer;
}

@ApiTags('pawapay')
@Controller('pawapay')
export class PawapayController {
  private readonly logger = new Logger(PawapayController.name);

  constructor(
    private readonly pawapayService: PawapayService,
    private readonly pawapayWebhookService: PawapayWebhookService,
  ) {}

  @Get('providers')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary: 'List PawaPay providers and availability for a country',
  })
  @ApiOkResponse({
    description:
      'PawaPay providers within the specified country including availability metadata',
    type: PawapayProviderAvailabilityDto,
    isArray: true,
  })
  async listProviders(
    @Query() query: PawapayAvailabilityQueryDto,
  ): Promise<PawapayProviderAvailabilityDto[]> {
    return this.pawapayService.listProvidersAvailability(query.countryCode);
  }

  @Post('predict-provider')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Predict mobile money provider from phone number',
    description:
      'Uses PawaPay API to predict the country and mobile money provider from a phone number with country code.',
  })
  @ApiOkResponse({
    description: 'Provider prediction successful',
    type: PredictProviderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid phone number or missing parameter',
  })
  async predictProvider(
    @Body() dto: PredictProviderDto,
  ): Promise<PredictProviderResponseDto> {
    return this.pawapayService.predictProvider(dto.phoneNumber);
  }

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async handleCallback(
    @Req() req: RawBodyRequest,
    @Headers() headers: Record<string, string | string[]>,
  ): Promise<{ success: true }> {
    const rawBody =
      typeof req.rawBody === 'string'
        ? req.rawBody
        : req.rawBody instanceof Buffer
          ? req.rawBody.toString('utf8')
          : JSON.stringify(req.body ?? {});

    // Convert headers to string format for the service
    const normalizedHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      normalizedHeaders[key.toLowerCase()] = Array.isArray(value)
        ? value[0]
        : value;
    }

    // Log all headers for debugging
    this.logger.debug('PawaPay callback received - all headers:', {
      headerKeys: Object.keys(headers),
      normalizedHeaders,
    });
    this.logger.debug('PawaPay callback - raw body preview:', {
      length: rawBody.length,
      preview: rawBody.substring(0, 200),
    });

    // Validate signature
    await this.pawapayService.handleCallback<PawapayCallback>(
      (req.body ?? {}) as PawapayCallback,
      normalizedHeaders,
      rawBody,
    );

    // Process callback event
    await this.pawapayWebhookService.processCallback(
      req.body as PawapayCallback,
    );

    return { success: true };
  }

  // Development/Testing endpoints - blocked in production
  @Post('dev/test-deposit')
  @UseGuards(NonProdGuard)
  @ApiTags('admin')
  @ApiOperation({
    summary: 'Dev: Test Pawapay deposit functionality',
    description:
      'Creates a test deposit request to Pawapay for testing purposes. ' +
      'Non-production only: this endpoint is blocked in production by guard and excluded from production documentation.',
  })
  @ApiResponse({
    status: 201,
    description: 'Test deposit created successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'pending' },
        data: { type: 'object' },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'This endpoint is disabled in production environments.',
  })
  async testDeposit(@Body() dto: TestDepositDto) {
    const depositId = randomUUID();

    try {
      this.logger.log(`Creating test deposit with depositId: ${depositId}`);
      this.logger.debug(
        `Deposit request: ${JSON.stringify({ depositId, ...dto })}`,
      );

      const result = await this.pawapayService.createDeposit({
        depositId,
        payer: {
          type: 'MMO',
          accountDetails: {
            phoneNumber: dto.payer.msisdn,
            provider: dto.payer.provider,
          },
        },
        amount: dto.amount,
        currency: dto.currency,
        clientReferenceId: depositId,
        customerMessage: dto.customerMessage,
        preAuthorisationCode: dto.preAuthorisationCode,
        metadata: dto.metadata,
      });

      this.logger.log(
        `Test deposit created successfully with depositId: ${depositId}`,
      );
      return result;
    } catch (error) {
      if (error instanceof PawapayRequestException) {
        this.logger.error(
          `Failed to create test deposit with depositId: ${depositId}. ` +
            `Pawapay API Error: ${JSON.stringify(error.responsePayload)}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `Failed to create test deposit with depositId: ${depositId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
      throw error;
    }
  }

  @Post('dev/test-payout')
  @UseGuards(NonProdGuard)
  @ApiTags('admin')
  @ApiOperation({
    summary: 'Dev: Test Pawapay payout functionality',
    description:
      'Creates a test payout request to Pawapay for testing purposes. ' +
      'Non-production only: this endpoint is blocked in production by guard and excluded from production documentation.',
  })
  @ApiResponse({
    status: 201,
    description: 'Test payout created successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'pending' },
        data: { type: 'object' },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'This endpoint is disabled in production environments.',
  })
  async testPayout(@Body() dto: TestPayoutDto) {
    const payoutId = randomUUID();

    try {
      this.logger.log(`Creating test payout with payoutId: ${payoutId}`);
      this.logger.debug(
        `Payout request: ${JSON.stringify({ payoutId, ...dto })}`,
      );

      const result = await this.pawapayService.createPayout({
        payoutId,
        recipient: {
          type: 'MMO',
          accountDetails: {
            phoneNumber: dto.recipient.msisdn,
            provider: dto.recipient.provider,
          },
        },
        amount: dto.amount,
        currency: dto.currency,
        clientReferenceId: payoutId,
        customerMessage: dto.customerMessage,
        metadata: dto.metadata,
      });

      this.logger.log(
        `Test payout created successfully with payoutId: ${payoutId}`,
      );
      return result;
    } catch (error) {
      if (error instanceof PawapayRequestException) {
        this.logger.error(
          `Failed to create test payout with payoutId: ${payoutId}. ` +
            `Pawapay API Error: ${JSON.stringify(error.responsePayload)}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `Failed to create test payout with payoutId: ${payoutId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
      throw error;
    }
  }

  @Post('dev/test-refund')
  @UseGuards(NonProdGuard)
  @ApiTags('admin')
  @ApiOperation({
    summary: 'Dev: Test Pawapay refund functionality',
    description:
      'Creates a test refund request to Pawapay for testing purposes. ' +
      'Non-production only: this endpoint is blocked in production by guard and excluded from production documentation.',
  })
  @ApiResponse({
    status: 201,
    description: 'Test refund created successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'pending' },
        data: { type: 'object' },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'This endpoint is disabled in production environments.',
  })
  async testRefund(@Body() dto: TestRefundDto) {
    const refundId = randomUUID();

    try {
      this.logger.log(
        `Creating test refund with refundId: ${refundId} for depositId: ${dto.depositId}`,
      );
      this.logger.debug(
        `Refund request: ${JSON.stringify({ refundId, ...dto })}`,
      );

      const result = await this.pawapayService.createRefund({
        refundId,
        depositId: dto.depositId,
        amount: dto.amount,
        currency: dto.currency,
        clientReferenceId: refundId,
        metadata: dto.metadata,
      });

      this.logger.log(
        `Test refund created successfully with refundId: ${refundId}`,
      );
      return result;
    } catch (error) {
      if (error instanceof PawapayRequestException) {
        this.logger.error(
          `Failed to create test refund with refundId: ${refundId} for depositId: ${dto.depositId}. ` +
            `Pawapay API Error: ${JSON.stringify(error.responsePayload)}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `Failed to create test refund with refundId: ${refundId} for depositId: ${dto.depositId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
      throw error;
    }
  }
}
