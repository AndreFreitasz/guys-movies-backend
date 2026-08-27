import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class RateSerieDto {
  @IsInt()
  @Min(1)
  idTmdb: number;

  @IsNumber()
  @Min(0)
  @Max(5)
  rating: number;
}
