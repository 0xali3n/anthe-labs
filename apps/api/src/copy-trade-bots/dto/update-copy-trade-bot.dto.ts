import { IsString, IsOptional, IsIn, IsNumber } from 'class-validator';

export class UpdateCopyTradeBotDto {
  @IsString()
  @IsOptional()
  @IsIn(['running', 'stopped'])
  status?: 'running' | 'stopped'; // Update bot status

  @IsString()
  @IsOptional()
  traderAddress?: string; // Update target trader address

  @IsNumber()
  @IsOptional()
  allocatedAmount?: number; // Update allocated amount
}

