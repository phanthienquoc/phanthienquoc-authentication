import {
  Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Res, UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { JwtService } from './jwt.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly jwt: JwtService) {}

  @Get('status')
  status() {
    return {
      configured: Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET),
      service: 'phanthienquoc-authentication',
      passkeyConfigured: Boolean(process.env.PASSKEY_RP_ID && process.env.PASSKEY_ORIGIN),
    };
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
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.auth.login(input, { userAgent, response });
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
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = cookie?.match(/(?:^|;\\s*)tce_refresh_token=([^;]+)/)?.[1];
    if (!token) throw new UnauthorizedException('Refresh token required');
    return this.auth.refresh(decodeURIComponent(token), response);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) response: Response) {
    this.auth.clearRefreshCookie(response);
    return { ok: true };
  }
}
