import { Controller, Post, Get, Put, Body, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Upsert user (create or update) - requires authentication
  @Post('upsert')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard) // Protect endpoint - only authenticated users
  async upsert(@Body() createUserDto: CreateUserDto) {
    return this.usersService.upsert(createUserDto);
  }

  // Get current user - requires authentication
  @Get('me')
  @UseGuards(AuthGuard) // Protect endpoint - only authenticated users
  async getMe(@Request() req: any) {
    const userId = req.user?.id;
    return this.usersService.getMe(userId);
  }

  // Update current user - requires authentication
  @Put('me')
  @UseGuards(AuthGuard) // Protect endpoint - only authenticated users
  async updateMe(@Request() req: any, @Body() updateUserDto: UpdateUserDto) {
    const userId = req.user?.id;
    return this.usersService.update(userId, updateUserDto);
  }
}
