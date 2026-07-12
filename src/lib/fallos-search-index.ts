import 'server-only';

import { getAdminDb } from '@/lib/firebase-admin';
import { textMatchesQuery } from '@/lib/text-search';
import type { StoredFalloDocument } from '@/types/observatorio';
import type {
  FalloSearchFilters,
  FalloSearchHit,
  FalloSearchIndexDoc,
  FalloSearchResult,
  FalloSearchStats,
} from '@/types/fallos-search';

const COLLECTION = 'fallos_busqueda';

const SEARCH_STOPWORDS = new Set([
  'fallo',
  'fallos',
  'sentencia',
  'sentencias',
  'contra',
  'buscar',
  'busca',
  'caso',
  'casos',
  'juicio',
  'juicios',
  'relacionado',
  'relacionados',
  'relacionada',
  'relacionadas',
  'todos',
  'todas',
  'donde',
  'sobre',
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

export function buildSearchIndexDoc(fallo: StoredFalloDocument): FalloSearchIndexDoc {
  const demandadoNombres = [
    ...(fallo.demandadoEmpresas ?? []).map((e) => e.razon_social.trim()),
    ...(fallo.demandadoActores ?? []).map((e) => e.razon_social.trim()),
    ...(fallo.demandado ? [fallo.demandado.trim()] : []),
  ].filter(Boolean);

  const rubroNombres = (fallo.rubro ?? []).map((r) => r.nombre.trim()).filter(Boolean);
  const causaNombres = (fallo.causas ?? []).map((c) => c.nombre.trim()).filter(Boolean);
  const etiquetaNombres = (fallo.etiquetas ?? []).map((e) => e.nombre.trim()).filter(Boolean);
  const tipoJuicioNombre = fallo.tipoJuicio?.nombre?.trim() ?? null;
  const provinciaNombre = fallo.provincia?.nombre?.trim() ?? null;
  const ciudadNombre = fallo.ciudad?.nombre?.trim() ?? null;
  const juzgadoNombre = fallo.juzgado?.nombre?.trim() ?? null;
  const actor = (fallo.actor ?? '').trim();

  const textoSearch = normalizeSearchText(
    [
      actor,
      fallo.demandado,
      ...demandadoNombres,
      fallo.resumen,
      ...rubroNombres,
      ...causaNombres,
      ...etiquetaNombres,
      tipoJuicioNombre,
      provinciaNombre,
      ciudadNombre,
      juzgadoNombre,
      fallo.patrimonial,
      fallo.moral,
      fallo.punitivo,
      fallo.divisa?.codigo,
    ]
      .filter(Boolean)
      .join(' ')
  );

  const anonPreview = [
    `Fallo EXP. ${fallo.nroExpediente}`,
    actor ? `Actor: ${actor}` : null,
    demandadoNombres.length ? `Demandado: ${demandadoNombres.join('; ')}` : null,
    `Resumen: ${fallo.resumen}`,
    rubroNombres.length ? `Rubros: ${rubroNombres.join('; ')}` : null,
    causaNombres.length ? `Causas: ${causaNombres.join('; ')}` : null,
    tipoJuicioNombre ? `Tipo: ${tipoJuicioNombre}` : null,
    provinciaNombre ? `Provincia: ${provinciaNombre}` : null,
    juzgadoNombre ? `Tribunal: ${juzgadoNombre}` : null,
    `Fecha: ${fallo.fecha}`,
    fallo.patrimonial !== '0' || fallo.moral !== '0' || fallo.punitivo !== '0'
      ? `Montos: patrimonial ${fallo.patrimonial}, moral ${fallo.moral}, punitivo ${fallo.punitivo} ${fallo.divisa?.codigo ?? ''}`.trim()
      : null,
  ]
    .filter(Boolean)
    .join('. ');

  return {
    id: fallo.nroExpediente,
    actor,
    demandado: fallo.demandado,
    demandadoNombres,
    demandadoEmpresaIds: fallo.demandadoEmpresaIds ?? [],
    demandadoSearch: normalizeSearchText(demandadoNombres.join(' ')),
    actorSearch: normalizeSearchText(actor),
    rubroIds: fallo.rubroIds ?? [],
    rubroNombres,
    causaIds: fallo.causaIds ?? [],
    causaNombres,
    etiquetaIds: fallo.etiquetaIds ?? [],
    etiquetaNombres,
    resumen: fallo.resumen,
    textoSearch,
    tipoJuicioId: fallo.tipoJuicioId,
    tipoJuicioNombre,
    provinciaId: fallo.provinciaId,
    provinciaNombre,
    ciudadId: fallo.ciudadId,
    ciudadNombre,
    juzgadoId: fallo.juzgadoId,
    juzgadoNombre,
    fecha: fallo.fecha,
    fechaSort: fallo.fechaSort,
    patrimonial: fallo.patrimonial,
    moral: fallo.moral,
    punitivo: fallo.punitivo,
    divisaCodigo: fallo.divisa?.codigo ?? null,
    status: fallo.status ?? 'publish',
    createdAt: fallo.createdAt,
    updatedAt: fallo.updatedAt,
    anonPreview,
    indexedAt: new Date().toISOString(),
  };
}

export async function getFallosSearchIndexMeta(): Promise<{
  indexedAt: string | null;
  count: number;
} | null> {
  try {
    const db = getAdminDb();
    if (!db) return null;
    const snap = await db.collection('migration_meta').doc('fallos_search_index').get();
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

async function loadIndexDocs(filters: FalloSearchFilters): Promise<FalloSearchIndexDoc[]> {
  const db = dbOrThrow();

  if (filters.empresaId && !filters.empresaQuery) {
    const snap = await db
      .collection(COLLECTION)
      .where('demandadoEmpresaIds', 'array-contains', filters.empresaId)
      .get();
    return snap.docs.map((doc) => doc.data() as FalloSearchIndexDoc);
  }

  const snap = await db.collection(COLLECTION).get();
  return snap.docs.map((doc) => doc.data() as FalloSearchIndexDoc);
}

function sanitizeKeywords(keywords: string[]): string[] {
  return keywords
    .map((kw) => normalizeSearchText(kw))
    .filter((kw) => kw.length >= 3 && !SEARCH_STOPWORDS.has(kw));
}

function keywordVariants(keyword: string): string[] {
  const variants = new Set<string>([keyword]);
  if (keyword.endsWith('iones') && keyword.length > 6) {
    variants.add(keyword.slice(0, -5) + 'ion');
  }
  if (keyword.endsWith('es') && keyword.length > 4) {
    variants.add(keyword.slice(0, -2));
    variants.add(keyword.slice(0, -1));
  }
  if (keyword.endsWith('s') && keyword.length > 3) {
    variants.add(keyword.slice(0, -1));
  }
  return [...variants];
}

function textIncludesKeyword(textoSearch: string, keyword: string): boolean {
  return keywordVariants(keyword).some((variant) => textoSearch.includes(variant));
}

function collectTopicKeywords(filters: FalloSearchFilters): string[] {
  return sanitizeKeywords([
    ...(filters.keywords ?? []),
    ...(filters.rubroKeywords ?? []),
    ...(filters.causaKeywords ?? []),
    ...(filters.etiquetaKeywords ?? []),
  ]);
}

function matchesTopicSearch(doc: FalloSearchIndexDoc, filters: FalloSearchFilters): boolean {
  const keywords = collectTopicKeywords(filters);
  if (!keywords.length) return true;

  const searchableText = normalizeSearchText(
    [
      doc.textoSearch,
      doc.rubroNombres.join(' '),
      doc.causaNombres.join(' '),
      doc.etiquetaNombres.join(' '),
    ].join(' ')
  );

  return keywords.some((keyword) => textIncludesKeyword(searchableText, keyword));
}

function matchesNameQuery(fieldSearch: string, query?: string): boolean {
  return textMatchesQuery(fieldSearch, query ?? '');
}

function matchesDateRange(fechaSort: string, dateFrom?: string, dateTo?: string): boolean {
  const date = fechaSort.slice(0, 10);
  if (dateFrom && date < dateFrom) return false;
  if (dateTo && date > dateTo) return false;
  return true;
}

function computeStats(hits: FalloSearchHit[]): FalloSearchStats {
  const porRubro: Record<string, number> = {};
  const porProvincia: Record<string, number> = {};
  const porTipoJuicio: Record<string, number> = {};
  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (const hit of hits) {
    for (const rubro of hit.rubroNombres) {
      porRubro[rubro] = (porRubro[rubro] ?? 0) + 1;
    }
    const provincia = hit.provinciaNombre ?? 'Sin provincia';
    porProvincia[provincia] = (porProvincia[provincia] ?? 0) + 1;
    const tipo = hit.tipoJuicioNombre ?? 'Sin tipo';
    porTipoJuicio[tipo] = (porTipoJuicio[tipo] ?? 0) + 1;

    const d = hit.fecha;
    if (!minDate || d < minDate) minDate = d;
    if (!maxDate || d > maxDate) maxDate = d;
  }

  return {
    total: hits.length,
    porRubro,
    porProvincia,
    porTipoJuicio,
    rangoFechas: { desde: minDate, hasta: maxDate },
  };
}

function toHit(doc: FalloSearchIndexDoc): FalloSearchHit {
  return {
    id: doc.id,
    actor: doc.actor,
    demandado: doc.demandado,
    demandadoNombres: doc.demandadoNombres,
    resumen: doc.resumen,
    rubroNombres: doc.rubroNombres,
    causaNombres: doc.causaNombres,
    tipoJuicioNombre: doc.tipoJuicioNombre,
    provinciaNombre: doc.provinciaNombre,
    juzgadoNombre: doc.juzgadoNombre,
    fecha: doc.fecha,
    patrimonial: doc.patrimonial,
    moral: doc.moral,
    punitivo: doc.punitivo,
    divisaCodigo: doc.divisaCodigo,
    status: doc.status,
    anonPreview: doc.anonPreview,
  };
}

export async function searchFallosIndex(
  filters: FalloSearchFilters,
  interpretacion?: string
): Promise<FalloSearchResult> {
  const docs = await loadIndexDocs(filters);

  const filtered = docs.filter((doc) => {
    if (filters.status && filters.status !== 'all' && doc.status !== filters.status) {
      return false;
    }
    if (filters.empresaQuery && !matchesNameQuery(doc.demandadoSearch, filters.empresaQuery)) {
      return false;
    }
    if (filters.actorQuery && !matchesNameQuery(doc.actorSearch, filters.actorQuery)) {
      return false;
    }
    if (filters.rubroId && !doc.rubroIds.includes(filters.rubroId)) return false;
    if (filters.causaId && !doc.causaIds.includes(filters.causaId)) return false;
    if (filters.etiquetaId && !doc.etiquetaIds.includes(filters.etiquetaId)) return false;
    if (filters.tipoJuicioId && doc.tipoJuicioId !== filters.tipoJuicioId) return false;
    if (filters.provinciaId && doc.provinciaId !== filters.provinciaId) return false;
    if (filters.ciudadId && doc.ciudadId !== filters.ciudadId) return false;
    if (!matchesTopicSearch(doc, filters)) return false;
    if (!matchesDateRange(doc.fechaSort, filters.dateFrom, filters.dateTo)) return false;
    return true;
  });

  filtered.sort((a, b) => b.fechaSort.localeCompare(a.fechaSort));
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

  const snap = await db.collection('observatorio_empresas').get();
  let best: { id: number; score: number } | null = null;

  for (const doc of snap.docs) {
    const data = doc.data() as { id?: number; razon_social?: string };
    if (!data.id || !data.razon_social) continue;
    const name = normalizeSearchText(data.razon_social);
    if (name === normalized) return data.id;
    if (name.includes(normalized) || normalized.includes(name)) {
      const score = name.startsWith(normalized) ? 2 : 1;
      if (!best || score > best.score) best = { id: data.id, score };
    }
  }

  return best?.id ?? null;
}

export async function mergeParsedFalloFilters(
  parsed: FalloSearchFilters,
  manual?: Partial<FalloSearchFilters>
): Promise<FalloSearchFilters> {
  const merged: FalloSearchFilters = {
    ...parsed,
    ...manual,
    keywords: [...(parsed.keywords ?? []), ...(manual?.keywords ?? [])].filter(Boolean),
    rubroKeywords: [...(parsed.rubroKeywords ?? []), ...(manual?.rubroKeywords ?? [])].filter(Boolean),
    causaKeywords: [...(parsed.causaKeywords ?? []), ...(manual?.causaKeywords ?? [])].filter(Boolean),
    etiquetaKeywords: [...(parsed.etiquetaKeywords ?? []), ...(manual?.etiquetaKeywords ?? [])].filter(
      Boolean
    ),
  };

  if (manual?.empresaId) {
    merged.empresaId = manual.empresaId;
    merged.empresaQuery = undefined;
  }

  return merged;
}
