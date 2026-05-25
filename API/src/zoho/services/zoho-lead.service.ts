import { Injectable, Logger } from '@nestjs/common';
import { ZohoApiService } from './zoho-api.service';
import { ZohoTokenService } from './zoho-token.service';
import { ZohoLead } from '../interfaces/zoho-lead.interface';
import { ZohoCreateResponse } from '../interfaces/zoho-response.interface';
import { ContactUsDTO } from '../../marketing/dto/contact-us.dto';

@Injectable()
export class ZohoLeadService {
  private readonly logger = new Logger(ZohoLeadService.name);

  constructor(
    private readonly zohoApiService: ZohoApiService,
    private readonly zohoTokenService: ZohoTokenService,
  ) {}

  /**
   * Promote contact to lead from contact form data
   */
  async promoteContactToLead(contactData: ContactUsDTO): Promise<void> {
    if (!this.zohoTokenService.isConfigured()) {
      this.logger.warn('Zoho CRM not configured - skipping lead creation');
      return;
    }

    const accessToken = await this.zohoTokenService.ensureValidToken();

    const leadData: ZohoLead = {
      First_Name: contactData.firstName,
      Last_Name: contactData.lastName,
      Email: contactData.email,
      Company: this.determineCompany(contactData),
      Lead_Source: this.mapInterestToLeadSource(contactData.interest),
      Lead_Status: 'Not Contacted',
    };

    // Add optional fields
    if (contactData.phoneNumber) {
      leadData.Phone = contactData.phoneNumber;
    }

    if (contactData.message) {
      leadData.Description = contactData.message;
    }

    if (contactData.country) {
      leadData.Country = contactData.country;
    }

    const result = await this.zohoApiService.makeApiRequest<ZohoCreateResponse>(
      '/Leads',
      'POST',
      accessToken,
      { data: [leadData] },
    );

    if (!result.data || !result.data[0] || result.data[0].code !== 'SUCCESS') {
      throw new Error(
        `Lead creation failed: ${result.data?.[0]?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Get lead by ID
   */
  async getLeadById(leadId: string): Promise<any> {
    if (!this.zohoTokenService.isConfigured()) {
      throw new Error('Zoho CRM not configured');
    }

    const accessToken = await this.zohoTokenService.ensureValidToken();

    return await this.zohoApiService.makeApiRequest(
      `/Leads/${leadId}`,
      'GET',
      accessToken,
    );
  }

  /**
   * Create lead directly (without promoting from contact)
   */
  async createLead(leadData: ZohoLead): Promise<string> {
    if (!this.zohoTokenService.isConfigured()) {
      throw new Error('Zoho CRM not configured');
    }

    const accessToken = await this.zohoTokenService.ensureValidToken();

    const result = await this.zohoApiService.makeApiRequest<ZohoCreateResponse>(
      '/Leads',
      'POST',
      accessToken,
      { data: [leadData] },
    );

    if (result.data && result.data[0] && result.data[0].code === 'SUCCESS') {
      return result.data[0].details.id;
    } else {
      throw new Error(
        `Lead creation failed: ${result.data?.[0]?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Update existing lead
   */
  async updateLead(leadId: string, leadData: Partial<ZohoLead>): Promise<void> {
    if (!this.zohoTokenService.isConfigured()) {
      throw new Error('Zoho CRM not configured');
    }

    const accessToken = await this.zohoTokenService.ensureValidToken();

    const result = await this.zohoApiService.makeApiRequest<ZohoCreateResponse>(
      `/Leads/${leadId}`,
      'PUT',
      accessToken,
      { data: [leadData] },
    );

    if (!result.data || !result.data[0] || result.data[0].code !== 'SUCCESS') {
      throw new Error(
        `Lead update failed: ${result.data?.[0]?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Search leads by criteria
   */
  async searchLeads(criteria: string): Promise<any[]> {
    if (!this.zohoTokenService.isConfigured()) {
      throw new Error('Zoho CRM not configured');
    }

    const accessToken = await this.zohoTokenService.ensureValidToken();

    try {
      const result = await this.zohoApiService.makeApiRequest<{ data: any[] }>(
        `/Leads/search?criteria=${encodeURIComponent(criteria)}`,
        'GET',
        accessToken,
      );

      return result?.data || [];
    } catch (error) {
      // Handle 204 No Content or empty responses
      if (
        error.message.includes('204') ||
        error.message.includes('No Content')
      ) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Determine company from contact form data
   */
  private determineCompany(contactData: ContactUsDTO): string {
    if (contactData.interest === 'creator') {
      return 'Content Creator';
    } else if (contactData.interest === 'brand') {
      return 'Brand/Company';
    }
    return 'Unknown';
  }

  /**
   * Map interest to lead source
   */
  private mapInterestToLeadSource(interest: string): string {
    const sourceMap: Record<string, string> = {
      creator: 'Website - Creator',
      brand: 'Website - Brand',
      other: 'Website - Other',
    };
    return sourceMap[interest] || 'Website - Contact Form';
  }
}
