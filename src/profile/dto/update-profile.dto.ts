import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @ValidateIf((_object, value) => value !== null)
  @IsOptional()
  @IsString()
  @MaxLength(280)
  bio: string | null;
}
