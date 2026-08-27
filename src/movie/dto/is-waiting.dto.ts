import { IsInt, Min } from 'class-validator';

export class IsWaitingMovieDto {
  @IsInt()
  @Min(1)
  idTmdb: number;
}
