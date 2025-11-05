import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
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
}
