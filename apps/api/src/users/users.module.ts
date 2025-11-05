import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [AuthModule, WalletsModule], // Import WalletsModule for automatic wallet creation
  controllers: [UsersController],
  providers: [UsersService], // PrismaService is provided by AppModule (singleton)
  exports: [UsersService],
})
export class UsersModule {}
