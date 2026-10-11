import { IsString, MaxLength } from 'class-validator';

export class PasskeyPayloadDto {
  @IsString()
  @MaxLength(20_000)
  id!: string;

  @IsString()
  @MaxLength(20_000)
  rawId!: string;
}

export class RenamePasskeyDto {
  @IsString()
  @MaxLength(80)
  friendlyName!: string;
}
