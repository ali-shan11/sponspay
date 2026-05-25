import { ApiProperty } from '@nestjs/swagger';

export class FanPaymentResponseDto {
  @ApiProperty({
    description: 'Unique deposit ID for tracking',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  depositId: string;

  @ApiProperty({
    description: 'Fan session ID for WebSocket notifications',
    example: '660e8400-e29b-41d4-a716-446655440000',
  })
  fanSessionId: string;

  @ApiProperty({
    description: 'Transaction ID',
    example: '770e8400-e29b-41d4-a716-446655440000',
  })
  transactionId: string;

  @ApiProperty({
    description: 'Current status',
    example: 'pending',
  })
  status: string;

  @ApiProperty({
    description: 'Creator channel handle',
    example: 'myawesomechannel',
  })
  channelHandle: string;
}
