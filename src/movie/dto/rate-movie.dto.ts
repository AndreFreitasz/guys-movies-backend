import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class RateMovieDto {
  @IsInt()
  @Min(1)
  idTmdb: number;

  @IsNumber()
  @Min(0)
  @Max(5)
  rating: number;
}
