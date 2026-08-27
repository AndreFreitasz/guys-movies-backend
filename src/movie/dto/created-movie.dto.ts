import {
  IsInt,
  Matches,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatedMovieDto {
  @IsString()
  @MaxLength(100)
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
  @MaxLength(255)
  @Matches(/^(https:\/\/image\.tmdb\.org\/|\/)/, {
    message: 'posterPath deve apontar para a CDN de imagens da TMDB',
  })
  posterPath: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  director: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  voteAverage: number;
}
