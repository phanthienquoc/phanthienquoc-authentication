import { IsEmail, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @MinLength(12)
  @MaxLength(128)
  password!: string;
}
