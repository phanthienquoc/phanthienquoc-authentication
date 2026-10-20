import { Module } from '@nestjs/common';
import { AuthModule } from '../auth.module';
import { KeycloakController } from './keycloak.controller';
import { KeycloakAuthGuard } from './keycloak-auth.guard';
import { KeycloakTokenService } from './keycloak-token.service';
import { KeycloakIdentityService } from './keycloak-identity.service';

@Module({
  imports: [AuthModule],
  controllers: [KeycloakController],
  providers: [KeycloakTokenService, KeycloakAuthGuard, KeycloakIdentityService],
  exports: [KeycloakTokenService, KeycloakAuthGuard, KeycloakIdentityService],
})
export class KeycloakModule {}
