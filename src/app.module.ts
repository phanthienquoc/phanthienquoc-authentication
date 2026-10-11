import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, cache: true, envFilePath: ['.env.local', '.env'] }), AuthModule],
  controllers: [HealthController],
})
export class AppModule {}
