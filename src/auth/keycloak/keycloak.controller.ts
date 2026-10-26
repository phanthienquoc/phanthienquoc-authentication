import { Controller, Get, Headers, HttpCode, HttpStatus, Post, Req, Res, UseGuards, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from '../auth.service';
import { KeycloakAuthGuard, type KeycloakRequest } from './keycloak-auth.guard';
import { KeycloakIdentityService } from './keycloak-identity.service';

@Controller('oidc')
@UseGuards(KeycloakAuthGuard)
export class KeycloakController {
  constructor(
    private readonly identities: KeycloakIdentityService,
    private readonly auth: AuthService,
  ) {}

  @Get('me')
  async me(@Req() request: KeycloakRequest) {
    const user = request.keycloakUser!;
    const identity = await this.identities.syncAuthenticatedIdentity(user);

    return {
      identityId: identity.id,
      subject: user.sub,
      email: user.email,
      username: user.preferredUsername,
      roles: user.roles,
      lastAuthenticatedAt: identity.last_authenticated_at,
    };
  }
}
