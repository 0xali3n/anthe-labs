import { IsString, IsOptional } from 'class-validator';

export class UpdateCopyTradeBotDto {
  @IsString()
  @IsOptional()
  status?: 'running' | 'stopped'; // Update bot status

  @IsString()
  @IsOptional()
  traderAddress?: string; // Update target trader address
}

