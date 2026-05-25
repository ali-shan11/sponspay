import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  IsIn,
  Matches,
} from 'class-validator';

export class ContactUsDTO {
  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsIn(['creator', 'brand', 'other']) // Assuming these are the only valid options
  interest: string;

  @IsString()
  @MinLength(10)
  @MaxLength(200)
  message: string;

  @IsString()
  // Add any specific validation for country codes if needed, e.g., @Length(2, 2) for ISO codes
  country: string;

  @IsString()
  // This regex allows an empty string OR a string starting with '+' followed by 1 to 15 digits (basic E.164).
  // The frontend sends E.164 or an empty string.
  @Matches(/^$|^\+[1-9]\d{1,14}$/, {
    message:
      'phoneNumber must be a valid E.164 formatted number or an empty string',
  })
  phoneNumber?: string;
}
