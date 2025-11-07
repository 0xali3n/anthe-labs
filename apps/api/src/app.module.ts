import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';
import { PrismaModule } from './prisma/prisma.module';
import { AvatarsModule } from './avatars/avatars.module';

@Module({
  imports: [PrismaModule, UsersModule, WalletsModule, AvatarsModule], // PrismaModule is Global, so PrismaService available everywhere
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
