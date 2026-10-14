import { SetMetadata } from '@nestjs/common';

export const REQUIRED_KEYCLOAK_ROLES = 'requiredKeycloakRoles';
export const RequireKeycloakRoles = (...roles: string[]) =>
  SetMetadata(REQUIRED_KEYCLOAK_ROLES, roles);
