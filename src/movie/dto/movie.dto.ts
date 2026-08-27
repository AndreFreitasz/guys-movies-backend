export class MovieDto {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  wallpaper_path: string | null;
  vote_average: number;
  release_date: string;
  genres: string[];
  adult: boolean;
  providers?: ProvidersDto;
  cast?: CastDto[];
  director?: DirectorDto | null;
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

export class DirectorDto {
  name: string;
  profile_path: string | null;
}
