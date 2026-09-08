import {
  IsIn,
  IsInt,
  Matches,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  WATCH_SOURCES,
  WatchSourceValue,
} from '../../movie/dto/watch-source.dto';

export class CreatedSerieDto {
  @IsString()
  @MaxLength(100)
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
  @MaxLength(255)
  @Matches(/^(https:\/\/image\.tmdb\.org\/|\/)/, {
    message: 'posterPath deve apontar para a CDN de imagens da TMDB',
  })
  posterPath?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  voteAverage?: number | null;

  @IsOptional()
  @IsIn(WATCH_SOURCES)
  watchSource?: WatchSourceValue;

  @IsOptional()
  @IsInt()
  @Min(1)
  providerId?: number;
}
