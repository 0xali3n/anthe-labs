import { Module } from '@nestjs/common';
import { TraderRegistrationsService } from './trader-registrations.service';
import { TraderRegistrationsController } from './trader-registrations.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TraderRegistrationsController],
  providers: [TraderRegistrationsService],
  exports: [TraderRegistrationsService],
})
export class TraderRegistrationsModule {}
