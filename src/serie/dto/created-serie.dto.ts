import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatedSerieDto {
  @IsString()
  @MaxLength(300)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  overview: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  firstAirDate: string;

  @IsInt()
  @Min(1)
  idTmdb: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  posterPath?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfSeasons?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  voteAverage?: number | null;
}
