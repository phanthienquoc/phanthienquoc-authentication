import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AuthRepository } from './auth.repository';
import { JwtService } from './jwt.service';
import { MfaCryptoService } from './mfa-crypto.service';
import { MfaService } from './mfa.service';
import { AuthService } from './auth.service';
import { MfaLoginDto, RecoveryLoginDto } from './dto/mfa-login.dto';

@Controller('auth')
export class MfaController {
  constructor(
    private readonly users: AuthRepository,
    private readonly jwt: JwtService,
    private readonly mfa: MfaService,
    private readonly crypto: MfaCryptoService,
    private readonly auth: AuthService,
  ) {}

  @Post('mfa/setup')
  async setup(@Headers('authorization') authorization?: string) {
    const userId = this.authenticatedUserId(authorization);
    const secret = this.mfa.generateSecret();
    await this.users.updateMfa(userId, false, this.crypto.encrypt(secret));
    return { secret };
  }

  @Post('mfa/enable')
  async enable(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { secret: string; code: string },
  ) {
    const userId = this.authenticatedUserId(authorization);
    const user = await this.users.findById(userId);
    if (!user?.mfaSecretEncrypted || this.crypto.decrypt(user.mfaSecretEncrypted) !== body.secret) {
      throw new UnauthorizedException('Invalid MFA setup');
    }
    if (!this.mfa.verifyTotp(body.secret, body.code)) throw new UnauthorizedException('Invalid MFA code');
    await this.users.updateMfa(userId, true, this.crypto.encrypt(body.secret));
    const codes = Array.from({ length: 10 }, () => this.mfa.generateRecoveryCode());
    await this.users.createRecoveryCodes(userId, codes.map((code) => this.hash(code)));
    return { enabled: true, recoveryCodes: codes };
  }

  @Post('mfa/disable')
  async disable(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { code: string },
  ) {
    const userId = this.authenticatedUserId(authorization);
    const user = await this.users.findById(userId);
    if (!user?.mfaEnabled || !user.mfaSecretEncrypted) throw new UnauthorizedException('MFA is not enabled');
    if (!this.mfa.verifyTotp(this.crypto.decrypt(user.mfaSecretEncrypted), body.code)) {
      throw new UnauthorizedException('Invalid MFA code');
    }
    await this.users.updateMfa(userId, false, null);
    return { enabled: false };
  }

  @Post('mfa/login')
  async login(
    @Body() body: MfaLoginDto,
    @Headers('user-agent') userAgent: string | undefined,
  ) {
    const user = await this.users.findById(body.userId);
    if (!user?.mfaEnabled || !user.mfaSecretEncrypted) throw new UnauthorizedException('Invalid MFA configuration');
    if (!this.mfa.verifyTotp(this.crypto.decrypt(user.mfaSecretEncrypted), body.code)) {
      throw new UnauthorizedException('Invalid MFA code');
    }
    return { mfaVerified: true, accessToken: this.jwt.issue(user.id, user.role) };
  }

  @Post('mfa/recovery')
  async recovery(@Body() body: RecoveryLoginDto) {
    const user = await this.users.findById(body.userId);
    const codeHash = this.hash(body.code);
    if (!user?.mfaEnabled || !(await this.users.consumeRecoveryCode(user.id, codeHash))) {
      throw new UnauthorizedException('Invalid recovery code');
    }
    return { mfaVerified: true, accessToken: this.jwt.issue(user.id, user.role) };
  }

  @Get('mfa/status')
  async status(@Headers('authorization') authorization?: string) {
    const user = await this.users.findById(this.authenticatedUserId(authorization));
    return { enabled: user?.mfaEnabled ?? false };
  }

  private authenticatedUserId(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token required');
    return this.jwt.verify(authorization.slice(7)).sub;
  }

  private hash(code: string) {
    return createHash('sha256').update(code).digest('hex');
  }
}
