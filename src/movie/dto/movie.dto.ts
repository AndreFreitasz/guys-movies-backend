import { Dir } from "fs";

export class MovieDto {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  wallpaper_path: string;
  vote_average: number;
  release_date: string;
  genres: string[];
  adult: boolean;
  providers?: ProvidersDto;
  cast?: CastDto[];
  director?: DirectorDto;
}

export class CastDto {
  name: string;
  character: string;
  profile_path: string;
}

export class ProviderDto {
  provider_name: string;
  logo_path: string;
}

export class ProvidersDto {
  flatrate?: ProviderDto[];
  buy?: ProviderDto[];
  rent?: ProviderDto[];
}

export class DirectorDto {
  name: string;
  profile_path: string;
}