import {
  ConflictException, Injectable, ServiceUnavailableException, UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
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
    const existing = await this.repository.findByEmail(email);
    if (existing) throw new ConflictException('Unable to create account with these details');
    const passwordHash = await this.passwords.hash(input.password);
    try {
      const user = await this.repository.createUser({ email, passwordHash, role: 'user' });
      return { user: this.publicUser(user) };
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        throw new ConflictException('Unable to create account with these details');
      }
      throw new ServiceUnavailableException('Account creation unavailable');
    }
  }

  async login(input: LoginDto, context: { userAgent?: string; response: Response }) {
    const email = input.email.trim().toLowerCase();
    let user: AuthUser | null;
    try {
      user = await this.repository.findByEmail(email);
    } catch {
      throw new ServiceUnavailableException('Authentication unavailable');
    }
    if (!user || user.disabledAt || !(await this.passwords.verify(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const refreshToken = randomBytes(48).toString('base64url');
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    await this.repository.createRefreshSession({
      sessionId: randomUUID(), userId: user.id, tokenHash,
      expiresAt: new Date(Date.now() + Number(process.env.JWT_REFRESH_TTL_SECONDS ?? 2592000) * 1000),
      userAgent: context.userAgent,
    });
    this.setRefreshCookie(context.response, refreshToken);
    return { accessToken: this.jwt.issue(user.id, user.role) };
  }

  async me(userId: string) {
    const user = await this.repository.findById(userId);
    if (!user || user.disabledAt) throw new UnauthorizedException('User not found');
    return { user: this.publicUser(user) };
  }

  async refresh(presentedToken: string, response: Response) {
    const tokenHash = createHash('sha256').update(presentedToken).digest('hex');
    const previous = await this.repository.findRefreshSessionByTokenHash(tokenHash);
    if (!previous || previous.revokedAt || previous.expiresAt <= new Date()) {
      this.clearRefreshCookie(response);
      throw new UnauthorizedException('Invalid refresh token');
    }
    const revoked = await this.repository.revokeRefreshSession(previous.id);
    if (!revoked) {
      this.clearRefreshCookie(response);
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.repository.findById(previous.userId);
    if (!user || user.disabledAt) {
      this.clearRefreshCookie(response);
      throw new UnauthorizedException('Invalid refresh token');
    }
    const nextToken = randomBytes(48).toString('base64url');
    await this.repository.createRefreshSession({
      sessionId: randomUUID(), userId: user.id,
      tokenHash: createHash('sha256').update(nextToken).digest('hex'),
      expiresAt: new Date(Date.now() + Number(process.env.JWT_REFRESH_TTL_SECONDS ?? 2592000) * 1000),
    });
    this.setRefreshCookie(response, nextToken);
    return { accessToken: this.jwt.issue(user.id, user.role) };
  }

  clearRefreshCookie(response: Response) {
    response.cookie('tce_refresh_token', '', {
      httpOnly: true, secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax', path: '/api/auth', maxAge: 0,
    });
  }

  private setRefreshCookie(response: Response, token: string) {
    response.cookie('tce_refresh_token', token, {
      httpOnly: true, secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax', path: '/api/auth',
      maxAge: Number(process.env.JWT_REFRESH_TTL_SECONDS ?? 2592000) * 1000,
    });
  }

  private publicUser(user: AuthUser) {
    return { id: user.id, email: user.email, role: user.role };
  }
}
