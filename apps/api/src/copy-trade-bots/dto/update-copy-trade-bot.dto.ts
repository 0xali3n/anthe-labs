import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateCopyTradeBotDto {
  @IsString()
  @IsOptional()
  @IsIn(['running', 'stopped'])
  status?: 'running' | 'stopped'; // Update bot status

  @IsString()
  @IsOptional()
  traderAddress?: string; // Update target trader address
}

