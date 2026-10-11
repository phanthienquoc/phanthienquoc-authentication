import { IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class MfaLoginDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

export class RecoveryLoginDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @MaxLength(64)
  code!: string;
}
