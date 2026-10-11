import {
  Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Res, UnauthorizedException,
} from '@nestjs/common';
import { isIP } from 'node:net';
import type { Response } from 'express';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { JwtService } from './jwt.service';
import { AuthRepository } from './auth.repository';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly jwt: JwtService,
    private readonly repository: AuthRepository,
  ) {}

  @Get('status')
  async status() {
    const passkeyConfigured = Boolean(process.env.PASSKEY_RP_ID && process.env.PASSKEY_ORIGIN);
    if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
      return { configured: false, database: 'not_configured', passkeyConfigured };
    }
    try {
      await this.repository.ready();
      return { configured: true, database: 'connected', passkeyConfigured };
    } catch {
      return { configured: true, database: 'unavailable', passkeyConfigured };
    }
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  signup(@Body() input: SignupDto) {
    return this.auth.signup(input);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body() input: LoginDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Headers('x-forwarded-for') forwardedFor: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.auth.login(input, {
      userAgent,
      ip: this.clientIp(forwardedFor),
      response,
    });
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Bearer token required');
    return this.auth.me(this.jwt.verify(token).sub);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Headers('cookie') cookie: string | undefined,
    @Headers('x-forwarded-for') forwardedFor: string | undefined,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = cookie?.match(/(?:^|;\s*)tce_refresh_token=([^;]+)/)?.[1];
    if (!token) throw new UnauthorizedException('Refresh token required');
    return this.auth.refresh(decodeURIComponent(token), {
      response,
      ip: this.clientIp(forwardedFor),
      userAgent,
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) response: Response) {
    this.auth.clearRefreshCookie(response);
    return { ok: true };
  }

  private clientIp(value?: string) {
    const candidate = value?.split(',')[0]?.trim();
    return candidate && isIP(candidate) ? candidate : undefined;
  }
}
