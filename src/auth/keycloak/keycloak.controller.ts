import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { KeycloakAuthGuard, type KeycloakRequest } from './keycloak-auth.guard';

@Controller('oidc')
@UseGuards(KeycloakAuthGuard)
export class KeycloakController {
  @Get('me')
  me(@Req() request: KeycloakRequest) {
    const user = request.keycloakUser!;
    return {
      subject: user.sub,
      email: user.email,
      username: user.preferredUsername,
      roles: user.roles,
    };
  }
}
