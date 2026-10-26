import {
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AuthRepository, AuthUser } from './auth.repository';
import { JwtService } from './jwt.service';
import { PasswordService } from './password.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
  ) {}

  async signup(input: SignupDto) {
    const email = input.email.trim().toLowerCase();
    try {
      const user = await this.repository.createUser({
        email,
        passwordHash: await this.passwords.hash(input.password),
      });
      return { user: this.publicUser(user) };
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        throw new ConflictException('Unable to create account with these details');
      }
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('Account creation unavailable');
    }
  }

  async login(input: LoginDto, context: {
    userAgent?: string; ip?: string; response: Response;
  }) {
    const email = input.email.trim().toLowerCase();
    let user: AuthUser | null;
    try {
      user = await this.repository.findByEmail(email);
    } catch {
      throw new ServiceUnavailableException('Authentication unavailable');
    }
    if (!user || !(await this.passwords.verify(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Invalid credentials');
    if (user.mfaEnabled) return this.beginMfaLogin(user);
    return this.issueLoginForUser(user, context);
  }

  async issueLoginForUser(user: AuthUser, context: {
    userAgent?: string; ip?: string; response?: Response; mfaVerifiedAt?: number;
  }) {
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Invalid credentials');
    const refreshToken = randomBytes(48).toString('base64url');
    await this.repository.createRefreshSession({
      sessionId: randomUUID(),
      userId: user.id,
      familyId: randomUUID(),
      tokenHash: this.passwords.hashToken(refreshToken),
      expiresAt: new Date(
        Date.now() + Number(process.env.JWT_REFRESH_TTL_SECONDS ?? 2592000) * 1000,
      ),
      ip: context.ip,
      userAgent: context.userAgent,
    });
    if (context.response) this.setRefreshCookie(context.response, refreshToken);
    // Refresh token is only delivered by the HttpOnly cookie, never duplicated in JSON.
    const accessToken = context.mfaVerifiedAt === undefined
      ? this.jwt.issue(user.id, user.role)
      : this.jwt.issue(user.id, user.role, context.mfaVerifiedAt);
    return { accessToken };
  }

  /** Exchange a verified Keycloak identity for the existing app session contract. */
  async loginWithKeycloak(email: string, context: {
    userAgent?: string; ip?: string; response: Response;
  }) {
    const normalizedEmail = email.trim().toLowerCase();
    let user: AuthUser | null;
    try {
      user = await this.repository.findByEmail(normalizedEmail);
    } catch {
      throw new ServiceUnavailableException('Authentication unavailable');
    }
    if (!user || user.status !== 'ACTIVE' || user.email !== normalizedEmail) {
      throw new UnauthorizedException('No active account is linked to this verified identity');
    }
    // Do not silently bypass an account's existing app-managed MFA policy.
    // Those accounts keep using legacy sign-in until MFA assurance is migrated and tested.
    if (user.mfaEnabled) {
      throw new ForbiddenException('This account must use legacy sign-in until MFA migration is complete');
    }
    return this.issueLoginForUser(user, context);
  }

  async me(userId: string) {
    const user = await this.repository.findById(userId);
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('User not found');
    return { user: this.publicUser(user) };
  }

  async refresh(presentedToken: string, context: {
    response: Response; ip?: string; userAgent?: string;
  }) {
    const nextToken = randomBytes(48).toString('base64url');
    try {
      const result = await this.repository.rotateRefreshSession({
        tokenHash: this.passwords.hashToken(presentedToken),
        nextSessionId: randomUUID(),
        nextTokenHash: this.passwords.hashToken(nextToken),
        expiresAt: new Date(
          Date.now() + Number(process.env.JWT_REFRESH_TTL_SECONDS ?? 2592000) * 1000,
        ),
        ip: context.ip,
        userAgent: context.userAgent,
      });
      if (result.status === 'reuse-detected') {
        this.clearRefreshCookie(context.response);
        throw new UnauthorizedException('Refresh token reuse detected');
      }
      if (result.user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Refresh session invalid or expired');
      }
      this.setRefreshCookie(context.response, nextToken);
      return { accessToken: this.jwt.issue(result.user.id, result.user.role) };
    } catch (error) {
      this.clearRefreshCookie(context.response);
      if (error instanceof UnauthorizedException) throw error;
      if (error instanceof ServiceUnavailableException) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }
      throw error;
    }
  }

  async logout(presentedToken: string | undefined, response: Response) {
    if (presentedToken) {
      await this.repository.revokeRefreshToken(this.passwords.hashToken(presentedToken));
    }
    this.clearRefreshCookie(response);
    return { ok: true };
  }

  async beginMfaLogin(user: AuthUser) {
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Invalid credentials');
    if (!user.mfaEnabled || !user.mfaSecretEncrypted) {
      throw new UnauthorizedException('MFA is not enabled for this account');
    }
    const challengeToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.repository.createMfaLoginChallenge({
      userId: user.id,
      tokenHash: this.passwords.hashToken(challengeToken),
      expiresAt,
    });
    return {
      mfaRequired: true as const,
      challengeToken,
      mfaExpiresInSeconds: 300,
    };
  }

  hashMfaChallengeToken(challengeToken: string): string {
    return this.passwords.hashToken(challengeToken);
  }

  async completeMfaLogin(user: AuthUser, context: {
    userAgent?: string; ip?: string; response: Response;
  }) {
    return this.issueLoginForUser(user, { ...context, mfaVerifiedAt: Math.floor(Date.now() / 1000) });
  }

  async completeMfaRecoveryLogin(user: AuthUser, context: {
    userAgent?: string; ip?: string; response: Response;
  }) {
    return this.issueLoginForUser(user, { ...context, mfaVerifiedAt: Math.floor(Date.now() / 1000) });
  }

  clearRefreshCookie(response: Response) {
    response.cookie('tce_refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      path: '/auth',
      maxAge: 0,
    });
  }

  private setRefreshCookie(response: Response, token: string) {
    response.cookie('tce_refresh_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      path: '/auth',
      maxAge: Number(process.env.JWT_REFRESH_TTL_SECONDS ?? 2592000) * 1000,
    });
  }

  private publicUser(user: AuthUser) {
    return { id: user.id, email: user.email, role: user.role, mfaEnabled: user.mfaEnabled };
  }
}
