import { IsInt, Min } from 'class-validator';

export class IsWatchedMovieDto {
  @IsInt()
  @Min(1)
  idTmdb: number;
}
