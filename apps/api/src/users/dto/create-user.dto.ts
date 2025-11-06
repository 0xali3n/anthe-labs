import { IsString, IsEmail, IsUUID, IsOptional, IsBoolean, IsUrl, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsUUID()
  id: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  full_name?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  avatar_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  google_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  display_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  twitter_username?: string;

  @IsOptional()
  @IsBoolean()
  twitter_connected?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  twitter_user_id?: string;
}
