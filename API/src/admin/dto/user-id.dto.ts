import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class FirebaseUidDto {
  @ApiProperty({
    description:
      'Existing user Firebase UID (beneficiary) to seed transactions for or reset',
    example: 'YD60U0B8gCcvoujlslaIY5PpQJJ2',
  })
  @IsString()
  @Length(1, 128)
  firebaseUid!: string;
}
