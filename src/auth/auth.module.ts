import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { PasskeyRepository } from './passkey.repository';
import { PasskeyService } from './passkey.service';
import { JwtService } from './jwt.service';
import { PasswordService } from './password.service';
import { MfaService } from './mfa.service';
import { MfaCryptoService } from './mfa-crypto.service';
import { SupabaseClientService } from '../db/supabase.client';

@Module({
  controllers: [AuthController],
  providers: [
    SupabaseClientService,
    AuthService,
    AuthRepository,
    PasskeyRepository,
    PasskeyService,
    JwtService,
    PasswordService,
    MfaService,
    MfaCryptoService,
  ],
  exports: [AuthService, AuthRepository, JwtService, MfaService, MfaCryptoService],
})
export class AuthModule {}
