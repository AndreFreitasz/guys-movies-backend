import { IsInt, Min } from 'class-validator';

export class IsWatchedSerieDto {
  @IsInt()
  @Min(1)
  idTmdb: number;
}
