import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { KeycloakModule } from './auth/keycloak/keycloak.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, cache: true, envFilePath: ['.env.local', '.env'] }), AuthModule, UsersModule, KeycloakModule],
  controllers: [HealthController],
})
export class AppModule {}
