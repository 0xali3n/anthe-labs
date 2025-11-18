import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TraderRegistrationsService } from './trader-registrations.service';
import { RegisterTraderDto } from './dto/register-trader.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('trader-registrations')
export class TraderRegistrationsController {
  constructor(
    private readonly traderRegistrationsService: TraderRegistrationsService,
  ) {}

  // Get trader registration for current user (requires authentication)
  @Get('me')
  @UseGuards(AuthGuard)
  async getMyRegistration(@Request() req: any) {
    return this.traderRegistrationsService.findByUserId(req.user.id);
  }

  // Register a new trader (requires authentication)
  @Post('register')
  @UseGuards(AuthGuard)
  async register(
    @Request() req: any,
    @Body() registerTraderDto: RegisterTraderDto,
  ) {
    return this.traderRegistrationsService.register(
      req.user.id,
      registerTraderDto.address,
      registerTraderDto.botName,
    );
  }
}
