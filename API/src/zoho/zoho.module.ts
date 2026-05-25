import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZohoService } from './zoho.service';
import { ZohoApiService } from './services/zoho-api.service';
import { ZohoTokenService } from './services/zoho-token.service';
import { ZohoContactService } from './services/zoho-contact.service';
import { ZohoLeadService } from './services/zoho-lead.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([]), // Add entities here if needed for token storage
  ],
  providers: [
    // Internal services (not exported - used only within this module)
    ZohoApiService,
    ZohoTokenService,
    ZohoContactService,
    ZohoLeadService,

    // Main service (exported for use by other modules)
    ZohoService,
  ],
  exports: [
    // Only export the main orchestrator service
    // Other modules should use ZohoService, not the internal services directly
    ZohoService,
  ],
})
export class ZohoModule {}
