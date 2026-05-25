import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ZohoApiService } from './services/zoho-api.service';
import { ZohoTokenService } from './services/zoho-token.service';
import { ZohoContactService } from './services/zoho-contact.service';
import { ZohoLeadService } from './services/zoho-lead.service';
import { ZohoTokenStatus } from './interfaces/zoho-token.interface';
import { ContactUsDTO } from '../marketing/dto/contact-us.dto';
import { CreateProspectDto } from '../creator/dto/create-prospect.dto';

@Injectable()
export class ZohoService implements OnModuleInit {
  private readonly logger = new Logger(ZohoService.name);

  constructor(
    private readonly zohoApiService: ZohoApiService,
    private readonly zohoTokenService: ZohoTokenService,
    private readonly zohoContactService: ZohoContactService,
    private readonly zohoLeadService: ZohoLeadService,
  ) {}

  async onModuleInit() {
    // Token service handles its own initialization
    if (this.zohoTokenService.isConfigured()) {
      this.logger.log('Zoho CRM service initialized successfully');
    } else {
      this.logger.warn(
        'Zoho CRM service not initialized - ZOHO_REFRESH_TOKEN not found. Run setup scripts to configure.',
      );
    }
  }

  /**
   * Create contact and promote to lead (main workflow for contact form)
   */
  async createContactAndPromoteToLead(
    contactData: ContactUsDTO,
  ): Promise<void> {
    try {
      if (!this.zohoTokenService.isConfigured()) {
        this.logger.warn(
          'Zoho CRM not configured - skipping contact and lead creation. Run setup scripts to configure.',
        );
        return;
      }

      // First create contact
      const contactId =
        await this.zohoContactService.createContactFromContactForm(contactData);

      // Then promote to lead
      await this.zohoLeadService.promoteContactToLead(contactData);

      this.logger.log(
        `Successfully created contact and promoted to lead for ${contactData.email} with contact ID: ${contactId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create contact and lead for ${contactData.email}`,
        error,
      );
      // Don't throw the error to prevent contact form failures
      // The contact form should still work even if Zoho is down
    }
  }

  /**
   * Create or update contact from sign-in data
   */
  async createContactFromSignIn(signInData: CreateProspectDto): Promise<void> {
    try {
      await this.zohoContactService.createOrUpdateContactFromSignIn(signInData);
    } catch (error) {
      this.logger.error(
        `Failed to create/update Zoho contact for ${signInData.email}`,
        error,
      );
      // Don't throw the error to prevent sign-in failures
      // The sign-in should still work even if Zoho is down
    }
  }

  /**
   * Mark contact as having cancelled onboarding
   */
  async markContactOnboardingCancelled(
    email: string,
    reason?: string,
    wantsUpdates?: boolean,
  ): Promise<void> {
    try {
      await this.zohoContactService.markOnboardingCancelled(
        email,
        reason,
        wantsUpdates,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update Zoho contact for onboarding cancellation of ${email}`,
        error,
      );
    }
  }

  /**
   * Check connection to Zoho CRM
   */
  async checkConnection(): Promise<boolean> {
    try {
      if (!this.zohoTokenService.isConfigured()) {
        this.logger.warn('Zoho CRM not configured - connection check failed');
        return false;
      }

      const accessToken = await this.zohoTokenService.ensureValidToken();
      const isConnected = await this.zohoApiService.testConnection(accessToken);

      this.logger.log(
        `Zoho connection check: ${isConnected ? 'SUCCESS' : 'FAILED'}`,
      );
      return isConnected;
    } catch (error) {
      this.logger.error('Zoho connection check failed', error);
      return false;
    }
  }

  /**
   * Get lead by ID
   */
  async getLeadById(leadId: string): Promise<any> {
    return await this.zohoLeadService.getLeadById(leadId);
  }

  /**
   * Get current token status for debugging
   */
  getTokenStatus(): ZohoTokenStatus {
    return this.zohoTokenService.getTokenStatus();
  }

  /**
   * Force refresh the access token (useful for testing)
   */
  async forceTokenRefresh(): Promise<void> {
    await this.zohoTokenService.forceTokenRefresh();
  }
}
