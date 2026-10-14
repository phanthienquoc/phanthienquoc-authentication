import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { KeycloakTokenService, type KeycloakPrincipal } from './keycloak-token.service';
import { REQUIRED_KEYCLOAK_ROLES } from './keycloak-roles.decorator';

export interface KeycloakRequest extends Request {
  keycloakUser?: KeycloakPrincipal;
}

@Injectable()
export class KeycloakAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: KeycloakTokenService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<KeycloakRequest>();
    const authorization = request.headers.authorization;
    const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
    if (!match) throw new UnauthorizedException('Bearer access token required');

    const principal = await this.tokens.verifyAccessToken(match[1]);
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_KEYCLOAK_ROLES,
      [context.getHandler(), context.getClass()],
    ) ?? [];

    if (requiredRoles.some((role) => !principal.roles.includes(role))) {
      // Avoid disclosing which role was missing.
      throw new ForbiddenException('Insufficient role');
    }

    request.keycloakUser = principal;
    return true;
  }
}
