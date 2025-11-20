import { Module } from '@nestjs/common';
import { CopyTradeBotsController } from './copy-trade-bots.controller';
import { CopyTradeBotsService } from './copy-trade-bots.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CopyTradeBotsController],
  providers: [CopyTradeBotsService],
  exports: [CopyTradeBotsService],
})
export class CopyTradeBotsModule {}
