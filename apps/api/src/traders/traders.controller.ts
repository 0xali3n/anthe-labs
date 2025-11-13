import { Controller, Get, Param } from '@nestjs/common';
import { TradersService } from './traders.service';

@Controller('traders')
export class TradersController {
  constructor(private readonly tradersService: TradersService) {}

  // Get all traders
  @Get()
  async findAll() {
    return this.tradersService.findAll();
  }

  // Get a single trader by address
  @Get(':address')
  async findOne(@Param('address') address: string) {
    return this.tradersService.findOne(address);
  }
}

