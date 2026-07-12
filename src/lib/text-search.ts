/** Normaliza texto para búsqueda insensible a mayúsculas y acentos. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Indica si el texto contiene la consulta completa o cada palabra por separado. */
export function textMatchesQuery(haystack: string, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const normalizedHaystack = normalizeSearchText(haystack);
  if (normalizedHaystack.includes(normalizedQuery)) return true;

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) return false;

  return tokens.every((token) => normalizedHaystack.includes(token));
}

/** Puntúa coincidencias para ordenar resultados (mayor = mejor). */
export function scoreTextMatch(haystack: string, query: string): number {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 0;

  const normalizedHaystack = normalizeSearchText(haystack);
  if (!normalizedHaystack) return 0;

  if (normalizedHaystack === normalizedQuery) return 100;
  if (normalizedHaystack.startsWith(normalizedQuery)) return 90;

  const position = normalizedHaystack.indexOf(normalizedQuery);
  if (position >= 0) return 70 - Math.min(position, 50);

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && tokens.every((token) => normalizedHaystack.includes(token))) {
    return 50;
  }

  return 0;
}
