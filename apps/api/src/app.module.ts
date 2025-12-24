import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';
import { PrismaModule } from './prisma/prisma.module';
import { AvatarsModule } from './avatars/avatars.module';
import { TwitterModule } from './twitter/twitter.module';
import { TradersModule } from './traders/traders.module';
import { TraderRegistrationsModule } from './trader-registrations/trader-registrations.module';
import { CopyTradeBotsModule } from './copy-trade-bots/copy-trade-bots.module';
import { RedisModule } from './redis/redis.module';
import { FeedbackModule } from './feedback/feedback.module';

@Module({
  imports: [PrismaModule, UsersModule, WalletsModule, AvatarsModule, TwitterModule, TradersModule, TraderRegistrationsModule, CopyTradeBotsModule, RedisModule, FeedbackModule], // PrismaModule is Global, so PrismaService available everywhere
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
