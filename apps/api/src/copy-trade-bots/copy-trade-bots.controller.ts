import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CopyTradeBotsService } from './copy-trade-bots.service';
import { CreateCopyTradeBotDto } from './dto/create-copy-trade-bot.dto';
import { UpdateCopyTradeBotDto } from './dto/update-copy-trade-bot.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('copy-trade-bots')
export class CopyTradeBotsController {
  constructor(
    private readonly copyTradeBotsService: CopyTradeBotsService,
  ) {}

  // Create a new copy trade bot (requires authentication)
  @Post()
  @UseGuards(AuthGuard)
  async create(
    @Request() req: any,
    @Body() createDto: CreateCopyTradeBotDto,
  ) {
    return this.copyTradeBotsService.create(req.user.id, createDto);
  }

  // Get all bots for current user (requires authentication)
  @Get('me')
  @UseGuards(AuthGuard)
  async getMyBots(@Request() req: any) {
    return this.copyTradeBotsService.findByUserId(req.user.id);
  }

  // Get a single bot by ID (requires authentication)
  @Get(':id')
  @UseGuards(AuthGuard)
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.copyTradeBotsService.findOne(id, req.user.id);
  }

  // Update bot (stop/restart/update trader address) (requires authentication)
  @Put(':id')
  @UseGuards(AuthGuard)
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateCopyTradeBotDto,
  ) {
    return this.copyTradeBotsService.update(id, req.user.id, updateDto);
  }

  // Delete a bot (requires authentication)
  @Delete(':id')
  @UseGuards(AuthGuard)
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.copyTradeBotsService.remove(id, req.user.id);
  }
}

