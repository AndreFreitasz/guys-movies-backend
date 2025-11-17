export interface SearchResult {
  id: number;
  title: string;
  overview: string;
  poster_url: string;
  vote_average: number | null;
  release_date: string | null;
  popularity: number;
  type: 'movie' | 'serie';
  original_language: string;
}
