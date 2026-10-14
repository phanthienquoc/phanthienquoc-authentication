import { Module } from '@nestjs/common';
import { KeycloakController } from './keycloak.controller';
import { KeycloakAuthGuard } from './keycloak-auth.guard';
import { KeycloakTokenService } from './keycloak-token.service';

@Module({
  controllers: [KeycloakController],
  providers: [KeycloakTokenService, KeycloakAuthGuard],
  exports: [KeycloakTokenService, KeycloakAuthGuard],
})
export class KeycloakModule {}
