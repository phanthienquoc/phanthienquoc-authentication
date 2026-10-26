import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class MfaLoginDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  challengeToken!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

export class RecoveryLoginDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  challengeToken!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code!: string;
}
