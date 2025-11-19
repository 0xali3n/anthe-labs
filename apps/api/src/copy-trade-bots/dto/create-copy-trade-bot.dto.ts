import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCopyTradeBotDto {
  @IsString()
  @IsOptional()
  traderAddress?: string;

  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  @Min(0.01)
  allocatedAmount: number;

  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  @Min(0)
  @Max(100)
  allocationPercent: number;

  @IsString()
  @IsOptional()
  @IsIn(['smart_ratio', 'fixed_amount', 'advanced'])
  mode?: string;
}

