import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckChannelHandlesDto {
  @ApiProperty({
    description: 'Array of channel handles to check',
    maxItems: 5,
    minItems: 1,
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  handles: string[];
}
