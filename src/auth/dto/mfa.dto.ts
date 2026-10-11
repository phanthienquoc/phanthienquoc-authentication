import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class EnableMfaDto {
  @IsString()
  @MinLength(16)
  @MaxLength(128)
  secret!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

export class DisableMfaDto {
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
