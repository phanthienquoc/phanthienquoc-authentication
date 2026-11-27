import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { UsersManagementModule } from './users/users-management.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, cache: true, envFilePath: ['.env.local', '.env'] }), AuthModule, UsersManagementModule],
  controllers: [HealthController],
})
export class AppModule {}
