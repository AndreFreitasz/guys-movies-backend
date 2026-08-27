import { IsInt, Min } from 'class-validator';

export class GetRateDto {
  @IsInt()
  @Min(1)
  idTmdb: number;
}
