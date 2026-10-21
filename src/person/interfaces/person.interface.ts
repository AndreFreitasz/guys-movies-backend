export type MediaType = 'movie' | 'tv';

export interface RawCredit {
  id: number;
  media_type: MediaType;
  title?: string;
  name?: string;
  character?: string;
  job?: string;
  department?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
}

export interface PersonCredit {
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  year: number | null;
  voteAverage: number | null;
  voteCount: number;
  genreIds: number[];
  role: string;
  department: string;
}

export interface DepartmentSummary {
  key: string;
  label: string;
  count: number;
}

export interface GenreCount {
  id: number;
  name: string;
  count: number;
}

export interface PersonStats {
  totalTitles: number;
  firstYear: number | null;
  lastYear: number | null;
  topGenre: string | null;
  bestRated: PersonCredit | null;
}

export interface PersonCreditsPage {
  items: PersonCredit[];
  page: number;
  totalPages: number;
  total: number;
}

export interface PersonProfile {
  id: number;
  name: string;
  profilePath: string | null;
  biography: string | null;
  biographyLanguage: 'pt' | 'en' | null;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  knownForDepartment: string | null;
  departments: DepartmentSummary[];
  genres: GenreCount[];
  stats: PersonStats;
  highlights: PersonCredit[];
  defaultDepartment: string;
  credits: PersonCreditsPage;
}

export interface PersonSearchResult {
  id: number;
  name: string;
  profilePath: string | null;
  knownForDepartment: string | null;
  knownFor: string[];
}
