import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateNewsDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  subtitle: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  content: string;
}

export class UpdateNewsDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  subtitle: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  content: string;
}
