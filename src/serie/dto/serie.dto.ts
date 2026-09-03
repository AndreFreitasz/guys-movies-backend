import { SeasonDto } from './season.dto';

export class SerieDto {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  wallpaper_path: string | null;
  vote_average: number;
  first_air_date: string;
  genres: string[];
  adult: boolean;
  number_of_seasons: number;
  seasons: SeasonDto[];
  episodeRunTime: number | null;
  providers?: ProvidersDto;
  cast?: CastDto[];
  created_by?: CreatorDto[];

  // aliases em camelCase para compatibilidade com payloads do cliente
  posterPath?: string;
  wallpaperPath?: string;
  voteAverage?: number;
  firstAirDate?: string;
  numberOfSeasons?: number;
  idTmdb?: number;
}

export class CastDto {
  name: string;
  character: string;
  profile_path: string | null;
}

export class ProviderDto {
  provider_name: string;
  logo_path: string | null;
  id_provider: number;
}

export class ProvidersDto {
  flatrate?: ProviderDto[];
  buy?: ProviderDto[];
  rent?: ProviderDto[];
}

export class CreatorDto {
  name: string;
  profile_path: string | null;
}
