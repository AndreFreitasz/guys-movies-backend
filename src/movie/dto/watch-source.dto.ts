import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export const WATCH_SOURCES = [
  'streaming',
  'cinema',
  'physical',
  'other',
] as const;

export type WatchSourceValue = (typeof WATCH_SOURCES)[number];

export class WatchSourceDto {
  @IsOptional()
  @IsIn(WATCH_SOURCES)
  watchSource?: WatchSourceValue;

  @IsOptional()
  @IsInt()
  @Min(1)
  providerId?: number;
}
