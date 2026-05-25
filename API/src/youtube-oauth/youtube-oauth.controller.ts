import {
  Controller,
  Delete,
  Get,
  Header,
  Post,
  Query,
  Res,
  Req,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { YouTubeOAuthService } from './youtube-oauth.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ConfigService } from '@nestjs/config';
import { User } from '../creator/entities/user.entity';
import { MockChannelQueryDto } from './dto/mock-channel-query.dto';
import { UserRole } from '../creator/enums/user.enum';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('YouTube OAuth')
@Controller('creator/youtube')
export class YouTubeOAuthController {
  constructor(
    private readonly youtubeOAuthService: YouTubeOAuthService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Helper method to get User's database ID from Firebase UID
   */
  private async getUserIdFromFirebaseUid(firebaseUid: string): Promise<string> {
    const user = await this.userRepository.findOne({
      where: { firebaseUid },
    });

    if (!user) {
      throw new NotFoundException(
        `User not found with Firebase UID: ${firebaseUid}`,
      );
    }

    return user.id;
  }

  /**
   * Get YouTube OAuth URL for popup flow
   * Returns the OAuth URL as JSON instead of redirecting
   */
  @Get('auth-url')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth('firebase')
  @ApiOperation({
    summary: 'Get YouTube OAuth URL',
    description:
      'Returns the OAuth URL for popup-based authentication flow. More secure than passing tokens in URL.',
  })
  @ApiQuery({
    name: 'returnUrl',
    description: 'URL to redirect to after OAuth completes',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns OAuth URL',
    schema: {
      type: 'object',
      properties: {
        authUrl: { type: 'string', description: 'Google OAuth consent URL' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid Firebase JWT token',
  })
  async getAuthUrl(
    @Req() req: Request,
    @Query('returnUrl') returnUrl: string,
  ): Promise<{ authUrl: string }> {
    const firebaseUid = (req as any)?.user?.uid || (req as any)?.user?.user_id;
    if (!firebaseUid) {
      throw new UnauthorizedException('Missing Firebase user identity');
    }

    const email: string | undefined = (req as any)?.user?.email;

    // Get User's database ID from Firebase UID
    const userId = await this.getUserIdFromFirebaseUid(firebaseUid);

    const authUrl = this.youtubeOAuthService.getAuthUrl(
      userId,
      returnUrl,
      email,
    );
    return { authUrl };
  }

  /**
   * Handle OAuth callback from Google
   * Exchanges code for refresh token and redirects back to frontend
   */
  @Get('callback')
  @ApiOperation({
    summary: 'OAuth callback endpoint',
    description:
      'Handles OAuth callback from Google, exchanges code for tokens',
  })
  @ApiQuery({
    name: 'code',
    description: 'Authorization code from Google',
    required: false,
  })
  @ApiQuery({
    name: 'state',
    description: 'State parameter for CSRF protection',
    required: false,
  })
  @ApiQuery({
    name: 'error',
    description: 'Error code if user denied access',
    required: false,
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects back to frontend with success/error query params',
  })
  @ApiResponse({
    status: 400,
    description: 'Missing code or state parameter, or state validation failed',
  })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get('FRONTEND_URL');

    // Handle user denial
    if (error === 'access_denied') {
      return res.redirect(`${frontendUrl}/oauth/callback?youtube_error=denied`);
    }

    if (!code || !state) {
      throw new BadRequestException('Missing code or state parameter');
    }

    const result = await this.youtubeOAuthService.handleCallback(code, state);

    // Redirect to OAuth callback page (for popup flow)
    // The callback page will use postMessage to communicate with parent window
    if (result.success) {
      return res.redirect(
        `${frontendUrl}/oauth/callback?youtube_connected=true`,
      );
    } else {
      const errorCode = result.error || 'failed';
      return res.redirect(
        `${frontendUrl}/oauth/callback?youtube_error=${errorCode}`,
      );
    }
  }

  /**
   * Sync YouTube channel data
   * Uses existing OAuth token to fetch and store channel info
   */
  @Post('sync')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth('firebase')
  @ApiOperation({
    summary: 'Sync YouTube channel data',
    description:
      'Fetches channel data from YouTube API using existing token and stores it in database. ' +
      'Useful when OAuth token exists but channel data is missing.',
  })
  @ApiResponse({
    status: 200,
    description: 'Channel data synced successfully',
    schema: {
      example: {
        success: true,
        channelId: 'UCxxxxx',
        channelName: 'My Channel',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'No OAuth token found or no channels available',
    schema: {
      examples: {
        noToken: {
          value: {
            success: false,
            error:
              'No YouTube OAuth token found - please connect YouTube first',
            requiresAuth: true,
          },
        },
        noChannels: {
          value: {
            success: false,
            error: 'No YouTube channels found on this account',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid Firebase JWT token',
  })
  async syncChannelData(@Req() req: Request) {
    const firebaseUid = (req as any)?.user?.uid || (req as any)?.user?.user_id;
    if (!firebaseUid) {
      throw new UnauthorizedException('Missing Firebase user identity');
    }

    // Get User's database ID from Firebase UID
    const userId = await this.getUserIdFromFirebaseUid(firebaseUid);

    return await this.youtubeOAuthService.syncChannelData(userId);
  }

  /**
   * Get YouTube channel data for revenue estimator
   * Returns channel info needed for onboarding calculations
   */
  @Get('channel-data')
  @UseGuards(FirebaseAuthGuard)
  @Header('Cache-Control', 'no-store')
  @ApiBearerAuth('firebase')
  @ApiOperation({
    summary: 'Get YouTube channel data for estimator',
    description:
      'Fetches YouTube channel information for revenue estimation during onboarding. Returns channel data if YouTube is connected, or connection status if not.',
  })
  @ApiResponse({
    status: 200,
    description: 'Channel data retrieved successfully',
    schema: {
      example: {
        connected: true,
        channels: [
          {
            id: 'UCxxxxxxxxxxxxx',
            title: 'My YouTube Channel',
            subscriberCount: '10000',
            viewCount: '1000000',
            videoCount: '50',
            thumbnailUrl: 'https://yt3.ggpht.com/...',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'YouTube not connected',
    schema: {
      example: {
        connected: false,
        error: 'YouTube not connected',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid Firebase JWT token',
  })
  async getChannelData(
    @Req() req: Request,
    @Query() query: MockChannelQueryDto,
  ) {
    // Handle mock data in non-production environments
    if (query.mock === 'true') {
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        throw new ForbiddenException(
          'Mock data is not available in production',
        );
      }

      return this.youtubeOAuthService.getMockChannelData({
        title: query.title,
        subscriberCount: query.subscriberCount,
        viewCount: query.viewCount,
        videoCount: query.videoCount,
      });
    }

    const firebaseUid = (req as any)?.user?.uid || (req as any)?.user?.user_id;
    if (!firebaseUid) {
      throw new UnauthorizedException('Missing Firebase user identity');
    }

    // Get User's database ID from Firebase UID
    const userId = await this.getUserIdFromFirebaseUid(firebaseUid);

    return await this.youtubeOAuthService.getChannelDataForEstimator(userId);
  }

  /**
   * Get YouTube Analytics report for a channel
   * Fetches subscriber and view data by country for revenue estimation
   */
  @Get('analytics-report')
  @UseGuards(FirebaseAuthGuard)
  @Header('Cache-Control', 'no-store')
  @ApiBearerAuth('firebase')
  @ApiOperation({
    summary: 'Get YouTube Analytics report',
    description:
      'Fetches YouTube Analytics data (views, subscribers by country) for revenue estimation. Requires YouTube to be connected. In non-production environments, pass ?mock=true to get simulated data for PawaPay-supported countries.',
  })
  @ApiQuery({
    name: 'channelId',
    description: 'YouTube channel ID',
    required: true,
  })
  @ApiQuery({
    name: 'durationMonths',
    description: 'Number of months to look back for analytics data',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'mock',
    description: 'Enable mock analytics data (non-production only)',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics report retrieved successfully',
    schema: {
      example: {
        kind: 'youtubeAnalytics#resultTable',
        columnHeaders: [
          { name: 'country', dataType: 'STRING' },
          { name: 'views', dataType: 'INTEGER' },
          { name: 'subscribersGained', dataType: 'INTEGER' },
        ],
        rows: [
          ['US', 10000, 500],
          ['GB', 5000, 250],
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'YouTube not connected or analytics data unavailable',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid Firebase JWT token',
  })
  async getAnalyticsReport(
    @Req() req: Request,
    @Query('channelId') channelId: string,
    @Query('durationMonths') durationMonths?: number,
    @Query('mock') mock?: string,
  ) {
    // Handle mock data in non-production environments
    if (mock === 'true') {
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        throw new ForbiddenException(
          'Mock data is not available in production',
        );
      }

      return this.youtubeOAuthService.getMockAnalyticsReport();
    }

    const firebaseUid = (req as any)?.user?.uid || (req as any)?.user?.user_id;
    if (!firebaseUid) {
      throw new UnauthorizedException('Missing Firebase user identity');
    }

    if (!channelId) {
      throw new BadRequestException('channelId is required');
    }

    // Get User's database ID from Firebase UID
    const userId = await this.getUserIdFromFirebaseUid(firebaseUid);

    return await this.youtubeOAuthService.getAnalyticsReport(
      userId,
      channelId,
      durationMonths,
    );
  }

  /**
   * Disconnect YouTube channel
   * Removes OAuth token and UserChannel junction for the authenticated user
   */
  @Delete('disconnect')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth('firebase')
  @ApiOperation({
    summary: 'Disconnect YouTube channel',
    description:
      'Removes the YouTube OAuth token and UserChannel junction for the authenticated user. ' +
      'Used during onboarding to allow connecting a different channel.',
  })
  @ApiResponse({
    status: 200,
    description: 'YouTube disconnected successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot disconnect after onboarding is complete',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid Firebase JWT token',
  })
  async disconnect(@Req() req: Request): Promise<{ success: boolean }> {
    const firebaseUid = (req as any)?.user?.uid || (req as any)?.user?.user_id;
    if (!firebaseUid) {
      throw new UnauthorizedException('Missing Firebase user identity');
    }

    // Defense in depth: prevent disconnecting after onboarding is complete
    const user = await this.userRepository.findOne({
      where: { firebaseUid },
    });

    if (
      user &&
      (user.role === UserRole.Creator || user.role === UserRole.Admin)
    ) {
      throw new BadRequestException(
        'Cannot disconnect YouTube after onboarding is complete',
      );
    }

    const userId = await this.getUserIdFromFirebaseUid(firebaseUid);
    await this.youtubeOAuthService.revokeConnection(userId);
    return { success: true };
  }
}
