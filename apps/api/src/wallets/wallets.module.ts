import { Module } from '@nestjs/common';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { AirdropService } from './airdrop.service';
import { EncryptionService } from '../encryption/encryption.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [WalletsController],
  providers: [WalletsService, AirdropService, EncryptionService], // PrismaService is provided by AppModule (singleton)
  exports: [WalletsService],
})
export class WalletsModule {}

