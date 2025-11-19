import { Module } from '@nestjs/common';
import { CopyTradeBotsController } from './copy-trade-bots.controller';
import { CopyTradeBotsService } from './copy-trade-bots.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CopyTradeBotsController],
  providers: [CopyTradeBotsService],
  exports: [CopyTradeBotsService],
})
export class CopyTradeBotsModule {}

