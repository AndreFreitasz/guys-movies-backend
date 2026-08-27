import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatedMovieDto {
  @IsString()
  @MaxLength(300)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  overview: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  releaseDate: string;

  @IsInt()
  @Min(1)
  idTmdb: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  posterPath: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  director: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  voteAverage: number;
}
