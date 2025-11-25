import { Module } from '@nestjs/common';
import { CopyTradeBotsController } from './copy-trade-bots.controller';
import { CopyTradeBotsService } from './copy-trade-bots.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [AuthModule, PrismaModule, WalletsModule],
  controllers: [CopyTradeBotsController],
  providers: [CopyTradeBotsService],
  exports: [CopyTradeBotsService],
})
export class CopyTradeBotsModule {}
