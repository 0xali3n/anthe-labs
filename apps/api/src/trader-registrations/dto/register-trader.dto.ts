import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class RegisterTraderDto {
  @IsString()
  @IsNotEmpty()
  address: string; // Wallet address from browser wallet connection

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  botName: string; // Bot/trader display name
}

