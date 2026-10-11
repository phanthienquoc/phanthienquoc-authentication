import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { MfaController } from './mfa.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { JwtService } from './jwt.service';
import { PasswordService } from './password.service';
import { MfaService } from './mfa.service';
import { MfaCryptoService } from './mfa-crypto.service';

@Module({
  controllers: [AuthController, MfaController],
  providers: [
    AuthService,
    AuthRepository,
    JwtService,
    PasswordService,
    MfaService,
    MfaCryptoService,
  ],
  exports: [AuthService, JwtService, MfaService, MfaCryptoService],
})
export class AuthModule {}
