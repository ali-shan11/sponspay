import { ApiProperty } from '@nestjs/swagger';
import { PaymentCountryDto } from './payment-country.dto';

export class YouTubeEmbedDto {
  @ApiProperty({
    description: 'YouTube channel name',
    example: 'Scott D.',
  })
  channelName: string;

  @ApiProperty({
    description: 'Embeddable YouTube URL',
    example: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  })
  embedUrl: string;

  @ApiProperty({
    description: 'Whether this is a live stream or regular video',
    example: true,
  })
  isLiveStream: boolean;

  @ApiProperty({
    description: 'Video or stream title',
    example: 'Live Q&A Session',
  })
  title: string;

  @ApiProperty({
    description: 'Video or stream description',
    example: 'Join us for a live Q&A session with the creator!',
  })
  description: string;

  @ApiProperty({
    description: 'Thumbnail URL',
    example: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  })
  thumbnailUrl: string;
}

export class RecentMessageDto {
  @ApiProperty({
    description: 'Full name of the person who sent the message',
    example: 'John Doe',
  })
  payerFullName: string;

  @ApiProperty({
    description:
      "Clean message body. For paid messages this is the fan's actual message " +
      '(the quoted portion of the Telegram payload). For creator messages the ' +
      '"Sent via SponsPay" footer is stripped.',
    example: 'Thanks for the support!',
  })
  content: string;

  @ApiProperty({
    description: 'Message timestamp in ISO 8601 format',
    example: '2025-12-07T10:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description:
      'Message sender type: "creator" for channel owner/admin messages, ' +
      '"paid" for fan messages sent via SponsPay payment',
    enum: ['creator', 'paid'],
    example: 'paid',
  })
  senderType: 'creator' | 'paid';

  @ApiProperty({
    description:
      'Telegram message id (as string) of this message. Null if unavailable.',
    example: '12345',
    nullable: true,
  })
  telegramMessageId: string | null;

  @ApiProperty({
    description:
      'If this message is a Telegram reply, the id of the parent message. Used to thread creator replies under the fan message they address.',
    example: '12340',
    nullable: true,
  })
  replyToMessageId: string | null;

  @ApiProperty({
    description:
      'Subject line extracted from a paid message payload. Null for creator messages.',
    example: "Filip's Special Request",
    nullable: true,
  })
  subject: string | null;

  @ApiProperty({
    description:
      'Amount string extracted from a paid message payload (e.g. "7500.00 XOF"). Null for creator messages.',
    example: '7500.00 XOF',
    nullable: true,
  })
  amount: string | null;

  @ApiProperty({
    description:
      'YouTube video id the paid message was attached to, if the fan sent it while watching a video. Null for creator messages or paid messages without video context.',
    example: 'dQw4w9WgXcQ',
    nullable: true,
  })
  youtubeVideoId: string | null;

  @ApiProperty({
    description:
      'Resolved YouTube video title for youtubeVideoId (cached). Null if the video is not available or lookup failed.',
    example: 'Live Q&A Session',
    nullable: true,
  })
  youtubeVideoTitle: string | null;
}

export class ChannelInfoResponseDto {
  @ApiProperty({
    description: 'Validated Telegram channel handle',
    example: 'myawesomechannel',
  })
  channelHandle: string;

  @ApiProperty({
    description:
      'Display name of the channel owner (from User.displayName). ' +
      'Falls back to channel handle if no owner found.',
    example: 'Scott D.',
  })
  creatorName: string;

  @ApiProperty({
    description:
      "YouTube video information (live stream or latest video) from the creator's onboarded YouTube channel. " +
      'Null if creator has not completed onboarding with a YouTube channel.',
    type: YouTubeEmbedDto,
    nullable: true,
  })
  youtubeEmbed: YouTubeEmbedDto | null;

  @ApiProperty({
    description:
      'Last 5 messages from the Telegram channel (may be fewer if not enough messages with content)',
    type: [RecentMessageDto],
  })
  recentMessages: RecentMessageDto[];

  @ApiProperty({
    description:
      'Whether the channel is currently accepting payments. ' +
      'Returns false if the creator is not present in the channel or bot cannot access the channel.',
    example: true,
  })
  paymentsAvailable: boolean;

  @ApiProperty({
    description:
      'Unlimited-use Telegram invite link for fans to join the creator channel. ' +
      'Null if link generation failed. Frontend can use this to generate QR codes.',
    example: 'https://t.me/+AbCdEfGhIjKlMnOp',
    nullable: true,
  })
  inviteLink: string | null;

  @ApiProperty({
    description:
      'Payment operators grouped by country with availability and pricing. ' +
      'Only includes countries where currency price is configured and operators have OPERATIONAL or DELAYED deposit status.',
    type: [PaymentCountryDto],
  })
  paymentCountries: PaymentCountryDto[];
}
