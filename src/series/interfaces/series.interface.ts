export interface SeriesRaw {
  id: number;
  name: string;
  poster_path: string;
  vote_average: number;
  vote_count: number;
  first_air_date: string;
  popularity: number;
  overview: string;
  original_language: string;
  genre_ids: number[];
  adult: boolean;
}

export interface Series extends SeriesRaw {
  poster_url: string;
}
