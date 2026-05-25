import { IsString, IsEmail, IsOptional, IsIn } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  company: string;

  @IsString()
  @IsIn(['creator', 'brand', 'other', 'website', 'contact_form'])
  leadSource: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsString()
  @IsIn(['Not Contacted', 'Contacted', 'Qualified', 'Unqualified'])
  leadStatus: string;
}
