import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class PasskeyPayloadDto {
  @IsString()
  @MaxLength(20_000)
  id!: string;

  @IsString()
  @MaxLength(20_000)
  rawId!: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsObject()
  response!: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  clientExtensionResults?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  authenticatorAttachment?: Record<string, unknown>;
}

export class RenamePasskeyDto {
  @IsString()
  @MaxLength(80)
  friendlyName!: string;
}
