import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProfileDto {
  @ValidateIf((_object, value) => value !== null)
  @IsOptional()
  @IsString()
  @MaxLength(280)
  bio?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9._-]+$/, {
    message:
      'O nome de usuario aceita apenas letras, numeros, ponto, hifen e underline',
  })
  username?: string;
}
