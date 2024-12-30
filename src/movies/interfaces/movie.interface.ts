export interface MovieRaw {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
  vote_count: number;
  release_date: string;
  popularity: number;
  overview: string;
  original_language: string;
  genre_ids: number[];
  adult: boolean;
}

export interface Movie extends MovieRaw {
  poster_url: string;
}
