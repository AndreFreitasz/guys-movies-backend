import { IsInt, Min } from 'class-validator';

export class GetRateSerieDto {
  @IsInt()
  @Min(1)
  idTmdb: number;
}
