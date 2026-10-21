import {
  MediaType,
  PersonCredit,
  RawCredit,
} from './interfaces/person.interface';

const SELF_ROLE_REGEX = /^(self|himself|herself)\b/i;
const NOISE_TV_GENRE_IDS = new Set([10767, 10763, 10764]);

export const DEPARTMENT_LABELS: Record<string, string> = {
  acting: 'Atuação',
  directing: 'Direção',
  writing: 'Roteiro',
  production: 'Produção',
  creator: 'Criação',
  crew: 'Equipe',
  camera: 'Fotografia',
  sound: 'Som',
  art: 'Arte',
  editing: 'Montagem',
  'costume-make-up': 'Figurino e maquiagem',
  'visual-effects': 'Efeitos visuais',
  lighting: 'Iluminação',
};

export const departmentSlug = (department: string): string =>
  (department || 'crew')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const departmentLabel = (slug: string): string =>
  DEPARTMENT_LABELS[slug] ??
  slug.replace(/-/g, ' ').replace(/^./, (first) => first.toUpperCase());

export const isNoiseCredit = (credit: RawCredit): boolean => {
  if (SELF_ROLE_REGEX.test(credit.character ?? '')) return true;

  if (credit.media_type !== 'tv') return false;

  return (credit.genre_ids ?? []).some((id) => NOISE_TV_GENRE_IDS.has(id));
};

const parseYear = (credit: RawCredit): number | null => {
  const raw = credit.release_date || credit.first_air_date || '';
  const year = Number(raw.slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : null;
};

const toCredit = (
  credit: RawCredit,
  department: string,
  role: string,
): PersonCredit => ({
  id: credit.id,
  mediaType: (credit.media_type ?? 'movie') as MediaType,
  title: credit.title || credit.name || 'Sem título',
  posterPath: credit.poster_path ?? null,
  year: parseYear(credit),
  voteAverage:
    typeof credit.vote_average === 'number' ? credit.vote_average : null,
  voteCount: credit.vote_count ?? 0,
  genreIds: credit.genre_ids ?? [],
  role,
  department,
});

export const normalizeCredits = (
  cast: RawCredit[],
  crew: RawCredit[],
): PersonCredit[] => {
  const seen = new Set<string>();
  const result: PersonCredit[] = [];

  const push = (credit: PersonCredit) => {
    const key = `${credit.department}:${credit.id}:${credit.role}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(credit);
  };

  for (const entry of Array.isArray(cast) ? cast : []) {
    if (isNoiseCredit(entry)) continue;
    push(toCredit(entry, 'acting', entry.character || 'Elenco'));
  }

  for (const entry of Array.isArray(crew) ? crew : []) {
    if (isNoiseCredit(entry)) continue;
    push(
      toCredit(
        entry,
        departmentSlug(entry.department ?? ''),
        entry.job || 'Equipe',
      ),
    );
  }

  return result;
};
