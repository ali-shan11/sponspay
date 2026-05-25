import { Injectable, Logger } from '@nestjs/common';
import { ZohoApiService } from './zoho-api.service';
import { ZohoTokenService } from './zoho-token.service';
import {
  ZohoContactData,
  ContactSearchResponse,
  ContactSearchResult,
} from '../interfaces/zoho-contact.interface';
import { ZohoCreateResponse } from '../interfaces/zoho-response.interface';
import { ContactUsDTO } from '../../marketing/dto/contact-us.dto';
import { CreateProspectDto } from '../../creator/dto/create-prospect.dto';

@Injectable()
export class ZohoContactService {
  private readonly logger = new Logger(ZohoContactService.name);

  constructor(
    private readonly zohoApiService: ZohoApiService,
    private readonly zohoTokenService: ZohoTokenService,
  ) {}

  /**
   * Create contact from contact form data
   */
  async createContactFromContactForm(
    contactData: ContactUsDTO,
  ): Promise<string> {
    if (!this.zohoTokenService.isConfigured()) {
      this.logger.warn(
        'Zoho CRM not configured - skipping contact creation from contact form',
      );
      return '';
    }

    const accessToken = await this.zohoTokenService.ensureValidToken();

    const contactDataForZoho: ZohoContactData = {
      First_Name: contactData.firstName,
      Last_Name: contactData.lastName,
      Email: contactData.email,
      Company: this.determineCompany(contactData),
      Lead_Source: this.mapInterestToLeadSource(contactData.interest),
      Department: 'Lead',
    };

    // Add optional fields
    if (contactData.phoneNumber) {
      contactDataForZoho.Phone = contactData.phoneNumber;
    }

    if (contactData.message) {
      contactDataForZoho.Description = contactData.message;
    }

    if (contactData.country) {
      contactDataForZoho.Country = contactData.country;
    }

    const result = await this.zohoApiService.makeApiRequest<ZohoCreateResponse>(
      '/Contacts',
      'POST',
      accessToken,
      { data: [contactDataForZoho] },
    );

    if (result.data && result.data[0] && result.data[0].code === 'SUCCESS') {
      return result.data[0].details.id;
    } else {
      throw new Error(
        `Contact creation failed: ${result.data?.[0]?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Create or update contact from sign-in data
   */
  async createOrUpdateContactFromSignIn(
    signInData: CreateProspectDto,
  ): Promise<void> {
    if (!this.zohoTokenService.isConfigured()) {
      this.logger.warn(
        'Zoho CRM not configured - skipping contact creation from sign-in',
      );
      return;
    }

    try {
      // Check if contact already exists
      const existingContact = await this.findContactByEmail(signInData.email);

      if (existingContact) {
        // Update existing contact
        await this.updateExistingContact(
          existingContact.id,
          signInData,
          existingContact.signInCount + 1,
        );
        this.logger.log(
          `Successfully updated Zoho contact for ${signInData.email} with ID: ${existingContact.id}`,
        );
      } else {
        // Create new contact
        const contactId = await this.createNewContactFromSignIn(signInData);
        this.logger.log(
          `Successfully created Zoho contact for ${signInData.email} with ID: ${contactId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to create/update Zoho contact for ${signInData.email}`,
        error,
      );
      // Don't throw the error to prevent sign-in failures
    }
  }

  /**
   * Find contact by email address
   */
  async findContactByEmail(email: string): Promise<ContactSearchResult | null> {
    const accessToken = await this.zohoTokenService.ensureValidToken();

    try {
      const searchQuery = `(Email:equals:${email})`;
      const result =
        await this.zohoApiService.makeApiRequest<ContactSearchResponse>(
          `/Contacts/search?criteria=${encodeURIComponent(searchQuery)}`,
          'GET',
          accessToken,
        );

      if (result && result.data && result.data.length > 0) {
        const contact = result.data[0];
        // Extract sign-in count from description if it exists
        const signInCount = this.extractSignInCountFromDescription(
          contact.Description || '',
        );
        return {
          id: contact.id,
          signInCount,
        };
      }

      return null;
    } catch (error) {
      // Handle 204 No Content or empty responses
      if (
        error.message.includes('204') ||
        error.message.includes('No Content')
      ) {
        return null;
      }
      this.logger.error(
        `Failed to search for contact with email ${email}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create new contact from sign-in data
   */
  private async createNewContactFromSignIn(
    signInData: CreateProspectDto,
  ): Promise<string> {
    const accessToken = await this.zohoTokenService.ensureValidToken();
    const contactData = this.mapSignInDataToContact(signInData, 1); // First sign-in

    const result = await this.zohoApiService.makeApiRequest<ZohoCreateResponse>(
      '/Contacts',
      'POST',
      accessToken,
      { data: [contactData] },
    );

    if (result.data && result.data[0] && result.data[0].code === 'SUCCESS') {
      return result.data[0].details.id;
    } else {
      throw new Error(
        `Contact creation failed: ${result.data?.[0]?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Update existing contact from sign-in data
   */
  private async updateExistingContact(
    contactId: string,
    signInData: CreateProspectDto,
    newSignInCount: number,
  ): Promise<void> {
    const accessToken = await this.zohoTokenService.ensureValidToken();
    const contactData = this.mapSignInDataToContact(signInData, newSignInCount);

    const result = await this.zohoApiService.makeApiRequest<ZohoCreateResponse>(
      `/Contacts/${contactId}`,
      'PUT',
      accessToken,
      { data: [contactData] },
    );

    if (!result.data || !result.data[0] || result.data[0].code !== 'SUCCESS') {
      throw new Error(
        `Contact update failed: ${result.data?.[0]?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Mark contact as having cancelled onboarding
   */
  async markOnboardingCancelled(
    email: string,
    reason?: string,
    wantsUpdates?: boolean,
  ): Promise<void> {
    if (!this.zohoTokenService.isConfigured()) {
      this.logger.warn(
        'Zoho CRM not configured - skipping onboarding cancellation update',
      );
      return;
    }

    try {
      const existingContact = await this.findContactByEmail(email);
      if (!existingContact) {
        this.logger.warn(
          `No existing contact found for ${email} - skipping cancellation update`,
        );
        return;
      }

      const accessToken = await this.zohoTokenService.ensureValidToken();

      // Fetch existing description
      let existingDescription = '';
      try {
        const details = await this.zohoApiService.makeApiRequest<any>(
          `/Contacts/${existingContact.id}`,
          'GET',
          accessToken,
        );
        existingDescription = details.data?.[0]?.Description
          ? details.data[0].Description
          : '';
      } catch (err) {
        this.logger.warn(
          `Failed to fetch existing description for ${email}`,
          err,
        );
      }

      const updatesPreference = wantsUpdates
        ? 'Wants to receive updates.'
        : 'Does not want updates.';
      const cancellationNote = `Onboarding cancelled on ${new Date().toISOString()}${
        reason ? `. Reason: ${reason}` : ''
      }. ${updatesPreference}`;
      const newDescription = existingDescription
        ? `${existingDescription}\n${cancellationNote}`.slice(0, 2000)
        : cancellationNote.slice(0, 2000);

      // Prepare update data
      const updateData: any = {
        Description: newDescription,
        Department: 'Cancelled',
      };

      // Set Email Opt Out to true if user does not want updates
      if (!wantsUpdates) {
        updateData.Email_Opt_Out = true;
      }

      const result =
        await this.zohoApiService.makeApiRequest<ZohoCreateResponse>(
          `/Contacts/${existingContact.id}`,
          'PUT',
          accessToken,
          { data: [updateData] },
        );

      if (
        !result.data ||
        !result.data[0] ||
        result.data[0].code !== 'SUCCESS'
      ) {
        throw new Error(
          `Contact update failed: ${result.data?.[0]?.message || 'Unknown error'}`,
        );
      }

      this.logger.log(
        `Marked onboarding cancelled for ${email} with contact ID: ${existingContact.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to mark onboarding cancelled for ${email}`,
        error,
      );
    }
  }

  /**
   * Map sign-in data to Zoho contact format
   */
  private mapSignInDataToContact(
    signInData: CreateProspectDto,
    signInCount: number,
  ): ZohoContactData {
    const nameParts = (signInData.displayName || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
      First_Name: firstName,
      Last_Name: lastName,
      Email: signInData.email,
      Company: 'User',
      Lead_Source: 'Website - Sign In',
      Department: 'Prospect',
      Description: this.buildSignInDescription(signInData, signInCount),
    };
  }

  /**
   * Build description for sign-in contact (limited to 2000 characters)
   */
  private buildSignInDescription(
    signInData: CreateProspectDto,
    signInCount: number,
  ): string {
    const parts: string[] = [];

    parts.push(`Google OAuth sign-in #${signInCount}`);

    if (signInData.signInContext) {
      parts.push(`Context: ${signInData.signInContext}`);
    }

    if (signInData.locale) {
      parts.push(`Locale: ${signInData.locale}`);
    }

    parts.push(`Google ID: ${signInData.googleUserId}`);

    const description = parts.join('. ');

    // Truncate to 2000 characters to be safe
    return description.length > 2000
      ? description.substring(0, 1997) + '...'
      : description;
  }

  /**
   * Extract sign-in count from description field
   */
  private extractSignInCountFromDescription(description: string): number {
    const match = description.match(/sign-in #(\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
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
