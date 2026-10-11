import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { PasskeyRepository } from './passkey.repository';
import { PasskeyService } from './passkey.service';
import { JwtService } from './jwt.service';
import { PasswordService } from './password.service';
import { MfaService } from './mfa.service';
import { MfaCryptoService } from './mfa-crypto.service';

@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: Pool,
      useFactory: () => new Pool({
        connectionString: process.env.DATABASE_URL,
        max: Number(process.env.DB_POOL_MAX ?? 5),
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
        ssl: process.env.DATABASE_URL?.includes('localhost') ? undefined : { rejectUnauthorized: true },
      }),
    },
    AuthService,
    AuthRepository,
    PasskeyRepository,
    PasskeyService,
    JwtService,
    PasswordService,
    MfaService,
    MfaCryptoService,
  ],
  exports: [AuthService, JwtService, MfaService, MfaCryptoService],
})
export class AuthModule {}
