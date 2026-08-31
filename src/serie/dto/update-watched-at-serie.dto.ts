import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateWatchedAtSerieDto {
  @IsInt()
  @Min(1)
  idTmdb: number;

  @IsOptional()
  @IsDateString()
  watchedAt?: string | null;
}
