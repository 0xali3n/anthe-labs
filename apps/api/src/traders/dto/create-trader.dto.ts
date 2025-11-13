import { IsString, IsInt, IsNotEmpty, IsNumberString } from 'class-validator';

export class CreateTraderDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsInt()
  numberOfTxns: number;

  @IsString()
  @IsNotEmpty()
  totalVolume: string;

  @IsString()
  @IsNotEmpty()
  pnl: string;

  @IsString()
  @IsNotEmpty()
  roi: string;
}

