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

  @Post('session')
  @HttpCode(HttpStatus.OK)
  async createSession(
    @Req() request: KeycloakRequest,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = request.keycloakUser!;
    const allowedClientId = process.env.KEYCLOAK_TCE_CLIENT_ID?.trim();
    if (!allowedClientId || user.claims.azp !== allowedClientId) {
      throw new UnauthorizedException('Keycloak client is not allowed to create a TCE session');
    }
    if (!user.email) {
      throw new UnauthorizedException('An email is required for account linking');
    }

    // Email verification may be skipped only for explicitly trusted Keycloak subjects.
    // Never globally trust unverified email: email-based account linking otherwise permits
    // an attacker to register an existing user's email and impersonate that account.
    const trustedUnverifiedSubjects = new Set(
      (process.env.KEYCLOAK_TCE_UNVERIFIED_EMAIL_SUBJECTS ?? '')
        .split(',')
        .map((subject) => subject.trim())
        .filter(Boolean),
    );
    if (user.emailVerified !== true && !trustedUnverifiedSubjects.has(user.sub)) {
      throw new UnauthorizedException('A verified email or explicitly trusted Keycloak subject is required');
    }

    await this.identities.syncAuthenticatedIdentity(user);
    const session = await this.auth.loginWithKeycloak(user.email, { userAgent, response });
    return { ...session, authMethod: 'keycloak' as const };
  }

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
