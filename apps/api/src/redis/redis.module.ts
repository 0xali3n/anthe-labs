import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global() // Make RedisModule global so RedisService can be injected anywhere
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}

