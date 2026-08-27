import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(80)
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;
}
