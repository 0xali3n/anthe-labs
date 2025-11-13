import { IsString, IsInt, IsOptional } from 'class-validator';

export class UpdateTraderDto {
  @IsInt()
  @IsOptional()
  numberOfTxns?: number;

  @IsString()
  @IsOptional()
  totalVolume?: string;

  @IsString()
  @IsOptional()
  pnl?: string;

  @IsString()
  @IsOptional()
  roi?: string;
}

