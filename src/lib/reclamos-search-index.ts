import 'server-only';

import { getAdminDb } from '@/lib/firebase-admin';
import type { StoredReclamoDocument } from '@/types/reclamos';
import type {
  ReclamoSearchFilters,
  ReclamoSearchHit,
  ReclamoSearchIndexDoc,
  ReclamoSearchResult,
  ReclamoSearchStats,
} from '@/types/reclamos-search';

const COLLECTION = 'reclamos_busqueda';
const HECHO_PREVIEW_LEN = 400;

const SEARCH_STOPWORDS = new Set([
  'reclamo',
  'reclamos',
  'denuncia',
  'denuncias',
  'contra',
  'buscar',
  'busca',
  'busqueda',
  'todas',
  'todos',
  'sobre',
  'empresa',
  'empresas',
  'caso',
  'casos',
  'resumen',
  'resumir',
  'resumem',
  'explica',
  'explicar',
  'haceme',
  'hacer',
  'tenemos',
]);

function dbOrThrow() {
  const db = getAdminDb();
  if (!db) throw new Error('Firebase Admin no configurado.');
  return db;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function collapseAlnum(value: string): string {
  return value.replace(/[^a-z0-9]/g, '');
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }

  return prev[b.length];
}

function maxEditDistance(len: number): number {
  if (len <= 4) return 1;
  if (len <= 8) return 2;
  return 3;
}

function tokenMatchesEmpresa(token: string, query: string): boolean {
  if (token.length < 3) return false;
  if (token.includes(query) || query.includes(token)) {
    // Evita falsos positivos con tokens muy cortos dentro del query.
    if (token.includes(query)) return query.length >= 3;
    return token.length >= Math.min(5, query.length);
  }

  const collapsedToken = collapseAlnum(token);
  const collapsedQuery = collapseAlnum(query);
  if (collapsedToken.includes(collapsedQuery) || collapsedQuery.includes(collapsedToken)) {
    return Math.min(collapsedToken.length, collapsedQuery.length) >= 4;
  }

  if (Math.abs(token.length - query.length) > maxEditDistance(query.length)) return false;
  return levenshtein(token, query) <= maxEditDistance(query.length);
}

export function buildSearchIndexDoc(reclamo: StoredReclamoDocument): ReclamoSearchIndexDoc {
  const empresaNombres = [
    ...reclamo.empresas.map((e) => e.nombre.trim()),
    ...(reclamo.otrasEmpresas ? [reclamo.otrasEmpresas.trim()] : []),
  ].filter(Boolean);

  const causaTextos = (reclamo.causas ?? []).map((c) => c.descripcion.trim()).filter(Boolean);
  const hechoPreview = reclamo.hecho.trim().slice(0, HECHO_PREVIEW_LEN);
  const estadoDescripcion = reclamo.estadoDescripcion?.trim() ?? 'Consulta';

  const textoSearch = normalizeSearchText(
    [
      reclamo.resumen,
      reclamo.hecho,
      ...empresaNombres,
      ...causaTextos,
      estadoDescripcion,
      reclamo.denunciante.provinciaNombre,
      reclamo.denunciante.ciudadNombre,
    ]
      .filter(Boolean)
      .join(' ')
  );

  const anonPreview = [
    `Reclamo #${reclamo.id}`,
    `Empresas: ${empresaNombres.join('; ') || '—'}`,
    `Estado: ${estadoDescripcion}`,
    `Resumen: ${reclamo.resumen}`,
    causaTextos.length ? `Causas: ${causaTextos.join('; ')}` : null,
    `Registrado: ${reclamo.createdAt.slice(0, 10)}`,
  ]
    .filter(Boolean)
    .join('. ');

  return {
    id: reclamo.id,
    empresaIds: reclamo.empresaIds,
    empresaNombres,
    empresaSearch: normalizeSearchText(empresaNombres.join(' ')),
    causaIds: (reclamo.causas ?? []).map((c) => c.id),
    causaTextos,
    resumen: reclamo.resumen,
    hechoPreview,
    textoSearch,
    estadoDescripcion,
    idCasoEstado: reclamo.idCasoEstado,
    idGrupoEstado: reclamo.idGrupoEstado,
    provinciaNombre: reclamo.denunciante.provinciaNombre,
    ciudadNombre: reclamo.denunciante.ciudadNombre,
    createdAt: reclamo.createdAt,
    updatedAt: reclamo.updatedAt,
    anonPreview,
    indexedAt: new Date().toISOString(),
  };
}

export async function getSearchIndexMeta(): Promise<{
  indexedAt: string | null;
  count: number;
} | null> {
  try {
    const db = getAdminDb();
    if (!db) return null;
    const snap = await db.collection('migration_meta').doc('reclamos_search_index').get();
    if (!snap.exists) return { indexedAt: null, count: 0 };
    const data = snap.data();
    return {
      indexedAt: typeof data?.indexedAt === 'string' ? data.indexedAt : null,
      count: Number(data?.count ?? 0),
    };
  } catch {
    return null;
  }
}

async function loadIndexDocs(filters: ReclamoSearchFilters): Promise<ReclamoSearchIndexDoc[]> {
  const db = dbOrThrow();

  // Solo estrechar por ID cuando no hay texto libre: muchos reclamos cargan la
  // empresa en "otras empresas" / con typos y no tienen el empresaId de catálogo.
  if (filters.empresaId && !filters.empresaQuery) {
    const snap = await db
      .collection(COLLECTION)
      .where('empresaIds', 'array-contains', filters.empresaId)
      .get();
    return snap.docs.map((doc) => doc.data() as ReclamoSearchIndexDoc);
  }

  const snap = await db.collection(COLLECTION).get();
  return snap.docs.map((doc) => doc.data() as ReclamoSearchIndexDoc);
}

function matchesKeywords(textoSearch: string, keywords: string[]): boolean {
  if (!keywords.length) return true;
  return keywords.every((kw) => textoSearch.includes(normalizeSearchText(kw)));
}

function matchesEmpresaQuery(empresaSearch: string, query: string): boolean {
  const normalized = normalizeSearchText(query);
  if (!normalized) return true;
  if (empresaSearch.includes(normalized)) return true;

  const collapsedSearch = collapseAlnum(empresaSearch);
  const collapsedQuery = collapseAlnum(normalized);
  if (collapsedQuery.length >= 3 && collapsedSearch.includes(collapsedQuery)) return true;

  const queryTokens = normalized.split(/[^a-z0-9]+/).filter((token) => token.length >= 2);
  const empresaTokens = empresaSearch.split(/[^a-z0-9]+/).filter(Boolean);

  // Todas las palabras del filtro deben aparecer en el nombre, en cualquier orden.
  if (queryTokens.length > 0) {
    const allTokensMatch = queryTokens.every(
      (qt) =>
        empresaSearch.includes(qt) ||
        empresaTokens.some((token) => tokenMatchesEmpresa(token, qt))
    );
    if (allTokensMatch) return true;
  }

  return empresaTokens.some((token) => tokenMatchesEmpresa(token, normalized));
}

function matchesEmpresaFilter(doc: ReclamoSearchIndexDoc, filters: ReclamoSearchFilters): boolean {
  const byId =
    filters.empresaId != null && Array.isArray(doc.empresaIds) && doc.empresaIds.includes(filters.empresaId);
  const byQuery = filters.empresaQuery
    ? matchesEmpresaQuery(doc.empresaSearch ?? '', filters.empresaQuery)
    : false;

  if (filters.empresaId != null && filters.empresaQuery) return byId || byQuery;
  if (filters.empresaId != null) return byId;
  if (filters.empresaQuery) return byQuery;
  return true;
}

function matchesDateRange(createdAt: string, dateFrom?: string, dateTo?: string): boolean {
  const date = createdAt.slice(0, 10);
  if (dateFrom && date < dateFrom) return false;
  if (dateTo && date > dateTo) return false;
  return true;
}

function matchesCausaKeywords(causaTextos: string[], keywords?: string[]): boolean {
  if (!keywords?.length) return true;
  const blob = normalizeSearchText(causaTextos.join(' '));
  return keywords.some((kw) => blob.includes(normalizeSearchText(kw)));
}

function computeStats(hits: ReclamoSearchHit[]): ReclamoSearchStats {
  const porEstado: Record<string, number> = {};
  const porGrupo: Record<string, number> = {};
  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (const hit of hits) {
    porEstado[hit.estadoDescripcion] = (porEstado[hit.estadoDescripcion] ?? 0) + 1;
    const grupo =
      hit.idGrupoEstado === 3 ? 'Archivados' : hit.idGrupoEstado === 2 ? 'En trámite' : 'Activos';
    porGrupo[grupo] = (porGrupo[grupo] ?? 0) + 1;

    const d = hit.createdAt.slice(0, 10);
    if (!minDate || d < minDate) minDate = d;
    if (!maxDate || d > maxDate) maxDate = d;
  }

  return {
    total: hits.length,
    porEstado,
    porGrupo,
    rangoFechas: { desde: minDate, hasta: maxDate },
  };
}

function toHit(doc: ReclamoSearchIndexDoc): ReclamoSearchHit {
  return {
    id: doc.id,
    resumen: doc.resumen,
    empresaNombres: doc.empresaNombres,
    causaTextos: doc.causaTextos,
    estadoDescripcion: doc.estadoDescripcion,
    idGrupoEstado: doc.idGrupoEstado,
    provinciaNombre: doc.provinciaNombre,
    createdAt: doc.createdAt,
    anonPreview: doc.anonPreview,
  };
}

export async function searchReclamosIndex(
  filters: ReclamoSearchFilters,
  interpretacion?: string
): Promise<ReclamoSearchResult> {
  const docs = await loadIndexDocs(filters);

  const filtered = docs.filter((doc) => {
    if (filters.idGrupoEstado != null && doc.idGrupoEstado !== filters.idGrupoEstado) {
      return false;
    }
    if (!matchesEmpresaFilter(doc, filters)) return false;
    if (!matchesKeywords(doc.textoSearch, filters.keywords ?? [])) return false;
    if (!matchesCausaKeywords(doc.causaTextos, filters.causaKeywords)) return false;
    if (!matchesDateRange(doc.createdAt, filters.dateFrom, filters.dateTo)) return false;
    return true;
  });

  filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const hits = filtered.map(toHit);

  return {
    hits,
    stats: computeStats(hits),
    filtersApplied: filters,
    interpretacion,
  };
}

export async function resolveEmpresaIdByName(query: string): Promise<number | null> {
  const db = dbOrThrow();
  const normalized = normalizeSearchText(query);
  if (normalized.length < 2) return null;

  const snap = await db.collection('reclamos_empresas').get();
  let best: { id: number; score: number } | null = null;

  for (const doc of snap.docs) {
    const data = doc.data() as { id?: number; nombreSearch?: string; nombre?: string };
    if (!data.id) continue;
    const name = normalizeSearchText(data.nombreSearch || data.nombre || '');
    if (!name) continue;

    if (name === normalized) return data.id;

    let score = 0;
    if (name.startsWith(normalized) || normalized.startsWith(name)) score = 3;
    else if (name.includes(normalized) || normalized.includes(name)) score = 2;
    else if (matchesEmpresaQuery(name, normalized)) score = 1;

    if (score > 0 && (!best || score > best.score)) {
      best = { id: data.id, score };
    }
  }

  return best?.id ?? null;
}

function stripEmpresaFromKeywords(keywords: string[] | undefined, empresaQuery?: string): string[] {
  if (!keywords?.length) return [];

  const eq = empresaQuery ? normalizeSearchText(empresaQuery) : '';
  const eqCollapsed = eq ? collapseAlnum(eq) : '';

  return keywords.filter((kw) => {
    const n = normalizeSearchText(kw);
    if (!n || n.length < 3) return false;
    if (SEARCH_STOPWORDS.has(n)) return false;
    if (!eq) return true;
    if (n === eq) return false;
    if (eq.includes(n) || n.includes(eq)) return false;
    const collapsed = collapseAlnum(n);
    if (eqCollapsed && (eqCollapsed.includes(collapsed) || collapsed.includes(eqCollapsed))) {
      return false;
    }
    return true;
  });
}

export async function mergeParsedFilters(
  parsed: ReclamoSearchFilters,
  manual?: Partial<ReclamoSearchFilters>
): Promise<ReclamoSearchFilters> {
  const merged: ReclamoSearchFilters = {
    ...parsed,
    ...manual,
    keywords: [...(parsed.keywords ?? []), ...(manual?.keywords ?? [])].filter(Boolean),
    causaKeywords: [...(parsed.causaKeywords ?? []), ...(manual?.causaKeywords ?? [])].filter(
      Boolean
    ),
  };

  if (manual?.empresaId) {
    merged.empresaId = manual.empresaId;
    merged.empresaQuery = undefined;
  } else if (merged.empresaQuery && !merged.empresaId) {
    const id = await resolveEmpresaIdByName(merged.empresaQuery);
    if (id) {
      // Conservar empresaQuery: el ID de catálogo suma hits, no reemplaza el texto libre.
      merged.empresaId = id;
    }
  }

  merged.keywords = stripEmpresaFromKeywords(merged.keywords, merged.empresaQuery);

  return merged;
}
