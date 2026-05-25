import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ContactUsDTO } from './dto/contact-us.dto';
import { CreateNewsDto, UpdateNewsDto } from './dto/news.dto';
import { CountryMarketDataDto } from './dto/country-market-data.dto';
import { MarketingService } from './marketing.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../decorators/role.decorator';
import { UserRole } from '../creator/enums/user.enum';
import {
  ApiSecurityProfile,
  ApiSecureEndpoint,
  ApiCommonResponses,
} from '../decorators/api-security-docs.decorator';
import { ApiKeyGuard } from '../auth/api-key.guard';

@ApiTags('marketing')
@Controller('marketing')
export class MarketingController {
  constructor(private marketingService: MarketingService) {}

  @UseGuards(ApiKeyGuard)
  @Post('contactus')
  @ApiOperation({
    summary: 'Submit contact form',
    description:
      ApiSecurityProfile({
        auth: 'API Key',
        authLocation: 'api-key header',
        authorization: 'None - Public endpoint',
        rateLimit: '5 requests per minute',
        dataSensitivity: 'Public',
        auditLogging: 'No',
        securityConsiderations: [
          'Input sanitization applied to all fields',
          'Email validation enforced',
          'Phone number format validated (E.164)',
          'Creates or updates contact record in CRM',
        ],
        commonErrors: {
          '401': 'Invalid or missing API key',
          '400': 'Invalid email format or missing required fields',
          '429': 'Rate limit exceeded - Maximum 5 requests per minute',
        },
      }) +
      '\n\n' +
      'Submits a contact form from the website and creates or updates a contact record in the CRM system. This endpoint is designed for public access and requires only an API key for authentication.',
  })
  @ApiResponse({
    status: 201,
    description: 'Contact form submitted successfully',
  })
  @ApiSecureEndpoint({
    auth: 'apiKey',
    rateLimit: '5 requests per minute',
  })
  @ApiCommonResponses()
  async sendContactUsEmail(@Body() contactUsDto: ContactUsDTO) {
    return await this.marketingService.processContactUsRequest(contactUsDto);
  }

  @Get('landing-page-details')
  @ApiOperation({
    summary: 'Get landing page content',
    description:
      ApiSecurityProfile({
        auth: 'None',
        authLocation: 'N/A - Public endpoint',
        authorization: 'None - Publicly accessible',
        rateLimit: '10 requests per minute',
        dataSensitivity: 'Public',
        auditLogging: 'No',
        securityConsiderations: [
          'Returns publicly available marketing content',
          'No authentication required',
          'Cached data for performance',
        ],
        commonErrors: {
          '429': 'Rate limit exceeded - Maximum 10 requests per minute',
          '500': 'Database connection error',
        },
      }) +
      '\n\n' +
      'Retrieves all content needed for the landing page, including news articles and marketing information. This is a public endpoint that requires no authentication.' +
      '\n\n**HTTP Caching**: Supports automatic ETag-based HTTP caching. Subsequent requests with matching ETags will receive HTTP 304 (Not Modified) responses, reducing bandwidth and improving load times for repeat visitors.',
  })
  @ApiResponse({
    status: 200,
    description: 'Landing page content retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_MODIFIED,
    description:
      'Content not modified - ETag matches (automatic HTTP caching via Express)',
  })
  @ApiCommonResponses()
  async getLandingPageDetails() {
    return await this.marketingService.getLandingPageDetails();
  }

  @UseGuards(ApiKeyGuard)
  @Get('country-market-data')
  @ApiOperation({
    summary: 'Get country market penetration data',
    description:
      ApiSecurityProfile({
        auth: 'API Key',
        authLocation: 'api-key header',
        authorization: 'None - API key only',
        rateLimit: '10 requests per minute',
        dataSensitivity: 'Public',
        auditLogging: 'No',
        securityConsiderations: [
          'Returns publicly available market research data',
          'API key required for access control',
          'Static reference data for onboarding estimator',
        ],
        commonErrors: {
          '401': 'Invalid or missing API key',
          '429': 'Rate limit exceeded',
          '500': 'Database connection error',
        },
      }) +
      '\n\n' +
      'Retrieves credit card and mobile phone penetration data for supported African countries. ' +
      'Used by the onboarding revenue estimator to calculate potential payment access.',
  })
  @ApiResponse({
    status: 200,
    description: 'Country market data retrieved successfully',
    type: CountryMarketDataDto,
    isArray: true,
  })
  @ApiSecureEndpoint({
    auth: 'apiKey',
    rateLimit: '10 requests per minute',
  })
  @ApiCommonResponses()
  async getCountryMarketData(): Promise<CountryMarketDataDto[]> {
    return this.marketingService.getCountryMarketData();
  }

  @Post('news')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Role(UserRole.Admin)
  @ApiOperation({
    summary: 'Create news article',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization: 'Admin role required',
        rateLimit: '10 requests per minute',
        dataSensitivity: 'Internal',
        auditLogging: 'No',
        securityConsiderations: [
          'Only administrators can create news articles',
          'Content is sanitized before storage',
          'Published articles are publicly visible',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '403': 'Forbidden - Admin role required',
          '400': 'Invalid news data or validation failure',
          '429': 'Rate limit exceeded - Maximum 10 requests per minute',
        },
      }) +
      '\n\n' +
      'Creates a new news article for display on the landing page. Only administrators can access this endpoint.',
  })
  @ApiResponse({
    status: 201,
    description: 'News article created successfully',
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    role: UserRole.Admin,
    rateLimit: '10 requests per minute',
  })
  @ApiCommonResponses()
  async createNews(@Body() createNewsDto: CreateNewsDto) {
    return await this.marketingService.createNews(createNewsDto);
  }

  @Get('news/latest/:count')
  @ApiOperation({
    summary: 'Get latest news articles',
    description:
      ApiSecurityProfile({
        auth: 'None',
        authLocation: 'N/A - Public endpoint',
        authorization: 'None - Publicly accessible',
        rateLimit: '10 requests per minute',
        dataSensitivity: 'Public',
        auditLogging: 'No',
        securityConsiderations: [
          'Returns only published news articles',
          'Results are ordered by publication date',
          'Count parameter limited to reasonable values',
        ],
        commonErrors: {
          '400': 'Invalid count parameter',
          '429': 'Rate limit exceeded - Maximum 10 requests per minute',
        },
      }) +
      '\n\n' +
      'Retrieves the latest published news articles for display on the landing page. The count parameter specifies how many articles to return.' +
      "\n\n**HTTP Caching**: Supports automatic ETag-based HTTP caching. Clients will receive HTTP 304 responses when content hasn't changed, improving performance.",
  })
  @ApiResponse({
    status: 200,
    description: 'Latest news articles retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_MODIFIED,
    description:
      'Content not modified - ETag matches (automatic HTTP caching via Express)',
  })
  @ApiCommonResponses()
  async getLatestNews(@Param('count', ParseIntPipe) count: number) {
    return await this.marketingService.getLatestNews(count);
  }

  @Put('news/:id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Role(UserRole.Admin)
  @ApiOperation({
    summary: 'Update news article',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization: 'Admin role required',
        rateLimit: '10 requests per minute',
        dataSensitivity: 'Internal',
        auditLogging: 'No',
        securityConsiderations: [
          'Only administrators can update news articles',
          'Content is sanitized before storage',
          'Updates are reflected immediately on the landing page',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '403': 'Forbidden - Admin role required',
          '400': 'Invalid news data or validation failure',
          '404': 'News article not found',
          '429': 'Rate limit exceeded - Maximum 10 requests per minute',
        },
      }) +
      '\n\n' +
      'Updates an existing news article. Only administrators can access this endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'News article updated successfully',
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    role: UserRole.Admin,
    rateLimit: '10 requests per minute',
  })
  @ApiCommonResponses()
  async updateNews(
    @Param('id') id: string,
    @Body() updateNewsDto: UpdateNewsDto,
  ) {
    return await this.marketingService.updateNews(id, updateNewsDto);
  }

  @Delete('news/:id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Role(UserRole.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete news article',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization: 'Admin role required',
        rateLimit: '10 requests per minute',
        dataSensitivity: 'Internal',
        auditLogging: 'No',
        securityConsiderations: [
          'Only administrators can delete news articles',
          'Soft delete - article is hidden but not permanently removed',
          'Deleted articles can be restored by admins',
          'Article is immediately removed from public display',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '403': 'Forbidden - Admin role required',
          '404': 'News article not found',
          '429': 'Rate limit exceeded - Maximum 10 requests per minute',
        },
      }) +
      '\n\n' +
      'Soft deletes a news article, removing it from public display. The article remains in the database and can be restored by administrators.',
  })
  @ApiResponse({
    status: 204,
    description: 'News article deleted successfully',
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    role: UserRole.Admin,
    rateLimit: '10 requests per minute',
  })
  @ApiCommonResponses()
  async softDeleteNews(@Param('id') id: string) {
    return await this.marketingService.softDeleteNews(id);
  }
}
