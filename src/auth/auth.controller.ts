import {
  Body, Controller, Delete, Get, Headers, HttpCode, HttpStatus, Param, Patch, Post,
  Res, UnauthorizedException,
} from '@nestjs/common';
import { isIP } from 'node:net';
import { createHash } from 'node:crypto';
import type { Response } from 'express';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { MfaLoginDto, RecoveryLoginDto } from './dto/mfa-login.dto';
import { EnableMfaDto, DisableMfaDto } from './dto/mfa.dto';
import { PasskeyPayloadDto, RenamePasskeyDto } from './dto/passkey.dto';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { JwtService } from './jwt.service';
import { MfaCryptoService } from './mfa-crypto.service';
import { MfaService } from './mfa.service';
import { PasskeyService } from './passkey.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly jwt: JwtService,
    private readonly repository: AuthRepository,
    private readonly mfa: MfaService,
    private readonly mfaCrypto: MfaCryptoService,
    private readonly passkey: PasskeyService,
  ) {}

  @Get('status')
  async status() {
    const passkeyConfigured = Boolean(process.env.PASSKEY_RP_ID && process.env.PASSKEY_ORIGIN);
    if (!process.env.DATABASE_URL || !process.env.JWT_SECRET || !process.env.MFA_ENCRYPTION_KEY) {
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
    return this.auth.login(input, { userAgent, ip: this.clientIp(forwardedFor), response });
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    const userId = this.authenticatedUserId(authorization);
    return this.auth.me(userId);
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
      response, ip: this.clientIp(forwardedFor), userAgent,
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(
    @Headers('cookie') cookie: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = cookie?.match(/(?:^|;\s*)tce_refresh_token=([^;]+)/)?.[1];
    return this.auth.logout(token ? decodeURIComponent(token) : undefined, response);
  }

  @Post('mfa/setup')
  async mfaSetup(@Headers('authorization') authorization?: string) {
    const userId = this.authenticatedUserId(authorization);
    const secret = this.mfa.generateSecret();
    await this.repository.updateMfa(userId, false, this.mfaCrypto.encrypt(secret));
    return { secret };
  }

  @Post('mfa/enable')
  async mfaEnable(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: EnableMfaDto,
  ) {
    const userId = this.authenticatedUserId(authorization);
    const user = await this.repository.findById(userId);
    if (!user?.mfaSecretEncrypted || this.mfaCrypto.decrypt(user.mfaSecretEncrypted) !== body.secret) {
      throw new UnauthorizedException('Invalid MFA setup');
    }
    if (!this.mfa.verifyTotp(body.secret, body.code)) {
      throw new UnauthorizedException('Invalid MFA code');
    }
    await this.repository.updateMfa(userId, true, this.mfaCrypto.encrypt(body.secret));
    const codes = Array.from({ length: 10 }, () => this.mfa.generateRecoveryCode());
    await this.repository.createRecoveryCodes(userId, codes.map((code) => this.hash(code)));
    return { enabled: true, recoveryCodes: codes };
  }

  @Post('mfa/disable')
  async mfaDisable(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: DisableMfaDto,
  ) {
    const userId = this.authenticatedUserId(authorization);
    const user = await this.repository.findById(userId);
    if (!user?.mfaEnabled || !user.mfaSecretEncrypted) {
      throw new UnauthorizedException('MFA is not enabled');
    }
    if (!this.mfa.verifyTotp(this.mfaCrypto.decrypt(user.mfaSecretEncrypted), body.code)) {
      throw new UnauthorizedException('Invalid MFA code');
    }
    await this.repository.updateMfa(userId, false, null);
    return { enabled: false };
  }

  @Post('mfa/login')
  async mfaLogin(
    @Body() body: MfaLoginDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Headers('x-forwarded-for') forwardedFor: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.repository.findById(body.userId);
    if (!user?.mfaEnabled || !user.mfaSecretEncrypted) {
      throw new UnauthorizedException('Invalid MFA configuration');
    }
    if (!this.mfa.verifyTotp(this.mfaCrypto.decrypt(user.mfaSecretEncrypted), body.code)) {
      throw new UnauthorizedException('Invalid MFA code');
    }
    return this.auth.completeMfaLogin(user, {
      response, userAgent, ip: this.clientIp(forwardedFor),
    });
  }

  @Post('mfa/recovery')
  async mfaRecovery(
    @Body() body: RecoveryLoginDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Headers('x-forwarded-for') forwardedFor: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.repository.findById(body.userId);
    if (!user?.mfaEnabled || !(await this.repository.consumeRecoveryCode(user.id, this.hash(body.code)))) {
      throw new UnauthorizedException('Invalid recovery code');
    }
    return this.auth.completeMfaRecoveryLogin(user, {
      response, userAgent, ip: this.clientIp(forwardedFor),
    });
  }

  @Get('mfa/status')
  async mfaStatus(@Headers('authorization') authorization?: string) {
    const user = await this.repository.findById(this.authenticatedUserId(authorization));
    return { enabled: user?.mfaEnabled ?? false };
  }

  @Post('passkey/register/options')
  async passkeyRegisterOptions(@Headers('authorization') authorization?: string) {
    return this.passkey.registrationOptions(this.authenticatedUserId(authorization));
  }

  @Post('passkey/register/verify')
  async passkeyRegisterVerify(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: PasskeyPayloadDto,
  ) {
    return this.passkey.registrationVerify(this.authenticatedUserId(authorization), body);
  }

  @Post('passkey/login/options')
  async passkeyLoginOptions() {
    return this.passkey.authenticationOptions();
  }

  @Post('passkey/login/verify')
  async passkeyLoginVerify(
    @Body() body: PasskeyPayloadDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Headers('x-forwarded-for') forwardedFor: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.passkey.authenticationVerify(body, this.clientIp(forwardedFor), userAgent);
    if (result.refreshToken) {
      this.setRefreshCookie(response, result.refreshToken);
      return { accessToken: result.accessToken };
    }
    return result;
  }

  @Get('passkeys')
  async passkeyList(@Headers('authorization') authorization?: string) {
    return this.passkey.list(this.authenticatedUserId(authorization));
  }

  @Patch('passkeys/:id')
  async passkeyRename(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() body: RenamePasskeyDto,
  ) {
    return this.passkey.rename(this.authenticatedUserId(authorization), id, body.friendlyName);
  }

  @Delete('passkeys/:id')
  async passkeyDelete(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
  ) {
    return this.passkey.remove(this.authenticatedUserId(authorization), id);
  }

  private authenticatedUserId(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token required');
    }
    return this.jwt.verify(authorization.slice(7)).sub;
  }

  private clientIp(value?: string) {
    const candidate = value?.split(',')[0]?.trim();
    return candidate && isIP(candidate) ? candidate : undefined;
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private setRefreshCookie(response: Response, token: string) {
    response.cookie('tce_refresh_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: Number(process.env.JWT_REFRESH_TTL_SECONDS ?? 2592000) * 1000,
    });
  }
}
