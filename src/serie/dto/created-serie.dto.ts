export class CreatedSerieDto {
  name: string;
  overview: string;
  firstAirDate: string;
  idTmdb: number;
  posterPath?: string | null;
  numberOfSeasons?: number | null;
  voteAverage?: number | null;
}
