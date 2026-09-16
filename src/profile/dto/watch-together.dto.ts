import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class TagCompanionDto {
  @IsIn(['movie', 'serie'])
  type: 'movie' | 'serie';

  @IsInt()
  @Min(1)
  idTmdb: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  seasonNumber?: number;

  @IsString()
  @MaxLength(40)
  companionUsername: string;
}

export class AcceptCompanionDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;
}

export class PendingCompanionDto {
  id: number;
  type: 'movie' | 'serie';
  idTmdb: number;
  seasonNumber: number | null;
  title: string;
  posterPath: string | null;
  watchedAt: string | null;
  requester: {
    username: string;
    name: string;
    avatarUpdatedAt: string | null;
  };
}
