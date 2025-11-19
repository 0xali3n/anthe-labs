import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateCopyTradeBotDto {
  @IsString()
  @IsOptional()
  traderAddress?: string; // Target trader wallet address (can be null initially)

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  allocatedAmount: number; // Amount allocated for copy trading

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(100)
  allocationPercent: number; // Percentage of user's balance allocated (0-100)

  @IsString()
  @IsOptional()
  mode?: string; // 'smart_ratio' | 'fixed_amount' | 'advanced'
}

