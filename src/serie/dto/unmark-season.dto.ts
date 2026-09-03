import { IsInt, Min } from 'class-validator';

export class UnmarkSeasonDto {
  @IsInt()
  @Min(1)
  idTmdb: number;

  @IsInt()
  @Min(1)
  seasonNumber: number;
}
