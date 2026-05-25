import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminDevService } from './admin-dev.service';
import { NonProdGuard } from './guards/non-prod.guard';
import { FirebaseUidDto } from './dto/user-id.dto';

@ApiTags('admin')
@Controller('admin/dev')
@UseGuards(NonProdGuard)
export class AdminDevController {
  constructor(private readonly adminDevService: AdminDevService) {}

  @Post('pre-seed-transactions')
  @ApiOperation({
    summary: 'Dev: Pre-seed transactions for a creator',
    description:
      'Creates ~500 transactions for the given firebaseUid (must exist) across multiple payment providers. ' +
      'Payer details are randomized for testing. ' +
      'Non-production only: this endpoint is blocked in production by guard and service checks.',
  })
  @ApiResponse({ status: 201, description: 'Transactions seeded' })
  @ApiForbiddenResponse({
    description: 'This endpoint is disabled in production environments.',
  })
  async preSeedTransactions(@Body() dto: FirebaseUidDto) {
    return this.adminDevService.preSeedTransactions(dto.firebaseUid);
  }

  @Post('reset-user')
  @ApiOperation({
    summary: 'Dev: Reset user seeded data',
    description:
      'Removes all transactions where the user is the beneficiary and deletes accounts owned by the user. ' +
      'Non-production only: this endpoint is blocked in production by guard and service checks.',
  })
  @ApiResponse({ status: 200, description: 'User dev data reset' })
  @ApiForbiddenResponse({
    description: 'This endpoint is disabled in production environments.',
  })
  async resetUser(@Body() dto: FirebaseUidDto) {
    return this.adminDevService.resetUser(dto.firebaseUid);
  }
}
