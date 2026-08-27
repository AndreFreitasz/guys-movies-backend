import { IsInt, Min } from 'class-validator';

export class IsWaitingSerieDto {
  @IsInt()
  @Min(1)
  idTmdb: number;
}
