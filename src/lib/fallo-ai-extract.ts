import 'server-only';

import {
  getCiudadesFromFirestore,
  getDivisasFromFirestore,
  getEmpresasFromFirestore,
  getEtiquetasFromFirestore,
  getJuzgadosFromFirestore,
  getProvinciasFromFirestore,
  getReclamosFromFirestore,
  getRubrosFromFirestore,
  getTiposJuicioFromFirestore,
} from '@/lib/observatorio-store';
import { extractFalloFromPdf, extractFalloResumenFromPdf, type FalloAiRawExtraction } from '@/lib/gemini';
import {
  DIVISA_CANASTA_CODIGO,
  DIVISA_PESOS_CODIGO,
  resolveDivisaCodigoFromText,
} from '@/lib/observatorio-divisas-shared';
import type { FalloAiExtractedForm, FalloAiExtractResult } from '@/types/fallo-ai';
import type { ProvinciaOption } from '@/types/observatorio';

export type { FalloAiExtractedForm, FalloAiExtractResult };

const RESUMEN_MAX = 1000;

const PROCEDURAL_RESUMEN_PATTERNS = [
  /se inici[oó]/i,
  /inici[oó]\s+(la\s+)?acci[oó]n/i,
  /orden[oó] tramitar/i,
  /imprim[ió]\s+tr[aá]mite/i,
  /tr[aá]mite\s+sumar[ií]simo/i,
  /dispuso traslado/i,
  /corri[oó]\s+traslado/i,
  /correr traslado/i,
  /traslado de la demanda/i,
  /corri[oó] vista/i,
  /se reserv[oó]/i,
  /pase a despacho/i,
  /tuvo por presentad/i,
  /acept[oó] la presentaci[oó]n/i,
  /tramitar el caso/i,
  /^el juzgado/i,
  /^el tribunal/i,
];

function resumenSoundsProcedural(resumen: string): boolean {
  return PROCEDURAL_RESUMEN_PATTERNS.some((pattern) => pattern.test(resumen));
}

function needsResumenRetry(resumen: string, hayResolucionSustantiva: boolean): boolean {
  if (!resumen.trim()) return true;
  if (!hayResolucionSustantiva) return true;
  return resumenSoundsProcedural(resumen);
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findBestMatch<T>(
  query: string | null | undefined,
  items: T[],
  getLabel: (item: T) => string
): T | null {
  const q = normalizeText(String(query ?? ''));
  if (!q || !items.length) return null;

  const scored = items
    .map((item) => {
      const label = normalizeText(getLabel(item));
      if (!label) return { item, score: 0 };
      if (label === q) return { item, score: 100 };
      if (label.includes(q) || q.includes(label)) return { item, score: 80 };
      const qWords = q.split(' ').filter((w) => w.length > 2);
      const matched = qWords.filter((w) => label.includes(w)).length;
      return { item, score: (matched / Math.max(qWords.length, 1)) * 60 };
    })
    .filter((entry) => entry.score >= 45)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.item ?? null;
}

function matchMany<T extends { id: number }>(
  labels: string[],
  items: T[],
  getLabel: (item: T) => string
): { ids: number[]; unmatched: string[] } {
  const ids: number[] = [];
  const unmatched: string[] = [];

  for (const label of labels) {
    const match = findBestMatch(label, items, getLabel);
    if (match && !ids.includes(match.id)) {
      ids.push(match.id);
    } else if (label.trim()) {
      unmatched.push(label.trim());
    }
  }

  return { ids, unmatched };
}

function findProvinciaContaining(
  provincias: ProvinciaOption[],
  fragment: string
): ProvinciaOption | null {
  const q = normalizeText(fragment);
  if (!q) return null;
  return provincias.find((item) => normalizeText(item.nombre).includes(q)) ?? null;
}

function jurisdictionContext(raw: FalloAiRawExtraction): string {
  return [raw.juzgado, raw.provincia, raw.ciudad].filter(Boolean).join(' ');
}

function isFederalJurisdiction(text: string): boolean {
  const n = normalizeText(text);
  return (
    n.includes('juzgado federal') ||
    n.includes('justicia federal') ||
    n.includes('camara federal') ||
    n.includes('corte federal') ||
    n.includes('tribunal federal') ||
    n.includes('fuero federal')
  );
}

function isNacionalJurisdiction(text: string): boolean {
  const n = normalizeText(text);
  return (
    n.includes('justicia nacional') ||
    n.includes('juzgado nacional') ||
    n.includes('camara nacional') ||
    n.includes('tribunal nacional') ||
    n.includes('fuero nacional')
  );
}

function resolveProvincia(
  raw: FalloAiRawExtraction,
  provincias: ProvinciaOption[]
): ProvinciaOption | null {
  const context = jurisdictionContext(raw);

  if (isFederalJurisdiction(context)) {
    return findProvinciaContaining(provincias, 'justicia federal');
  }
  if (isNacionalJurisdiction(context)) {
    return findProvinciaContaining(provincias, 'justicia nacional');
  }

  const fromAi = findBestMatch(raw.provincia, provincias, (p) => p.nombre);
  if (fromAi) return fromAi;

  if (raw.provincia) {
    const normalizedAi = normalizeText(raw.provincia);
    if (normalizedAi.includes('federal')) {
      return findProvinciaContaining(provincias, 'justicia federal');
    }
    if (normalizedAi.includes('nacional')) {
      return findProvinciaContaining(provincias, 'justicia nacional');
    }
  }

  return null;
}

function extractCityFromJuzgado(juzgado: string | null | undefined): string | null {
  const text = String(juzgado ?? '').trim();
  if (!text) return null;

  const deMatch = text.match(
    /(?:juzgado|tribunal|camara|cámara)\s+(?:federal|nacional)\s+(?:de|del)\s+([^,\d\-–]+)/i
  );
  if (deMatch?.[1]) return deMatch[1].trim();

  const dashMatch = text.match(/[-–]\s*([^,\d]+)$/);
  if (dashMatch?.[1]) return dashMatch[1].trim();

  return null;
}

function formatAmount(value: string | null | undefined): string {
  const raw = String(value ?? '').replace(/[^\d.,-]/g, '').replace(',', '.');
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return '0.00';
  return parsed.toFixed(2);
}

function normalizeFecha(value: string | null | undefined): string {
  const trimmed = String(value ?? '').trim();
  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, d, m, y] = slash;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${d}/${m}/${y}`;
  }
  return '';
}

function trimResumen(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= RESUMEN_MAX) return trimmed;
  const cut = trimmed.slice(0, RESUMEN_MAX);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > RESUMEN_MAX - 60 ? cut.slice(0, lastSpace) : cut).trim();
}

export async function extractFalloFormFromPdf(pdfBuffer: Buffer): Promise<FalloAiExtractResult> {
  const [
    rubros,
    tiposJuicio,
    reclamos,
    etiquetas,
    provincias,
    empresas,
    divisas,
  ] = await Promise.all([
    getRubrosFromFirestore(),
    getTiposJuicioFromFirestore(),
    getReclamosFromFirestore(),
    getEtiquetasFromFirestore(),
    getProvinciasFromFirestore(),
    getEmpresasFromFirestore(),
    getDivisasFromFirestore(),
  ]);

  const pdfBase64 = pdfBuffer.toString('base64');
  const raw = await extractFalloFromPdf(pdfBase64, {
    rubros: rubros.map((r) => r.rubro),
    tiposJuicio: tiposJuicio.map((t) => t.nombre),
    reclamos: reclamos.map((r) => r.description),
    etiquetas: etiquetas.map((e) => e.description),
    provincias: provincias.map((p) => p.nombre),
    divisas: divisas.map((d) => `${d.nombre} (${d.codigo})`),
  });

  const demandadoLabel =
    raw.demandado ??
    raw.demandadoEmpresas?.[0] ??
    raw.actorEmpresas?.[0] ??
    null;

  let resumenExtraction = await extractFalloResumenFromPdf(pdfBase64, {
    actor: raw.actor,
    demandado: demandadoLabel,
    juzgado: raw.juzgado,
  });

  let resumen = trimResumen(resumenExtraction.resumen);

  if (needsResumenRetry(resumen, resumenExtraction.hayResolucionSustantiva)) {
    resumenExtraction = await extractFalloResumenFromPdf(pdfBase64, {
      actor: raw.actor,
      demandado: demandadoLabel,
      juzgado: raw.juzgado,
    });
    resumen = trimResumen(resumenExtraction.resumen);
  }

  if (
    !resumen &&
    raw.dispositiva &&
    !resumenSoundsProcedural(raw.dispositiva)
  ) {
    resumen = trimResumen(raw.dispositiva);
  }

  const warnings = [...(raw.pendienteManual ?? [])];

  const rubroMatch = matchMany(raw.rubros ?? [], rubros, (r) => r.rubro);
  const causaMatch = matchMany(raw.causas ?? [], reclamos, (r) => r.description);
  const etiquetaMatch = matchMany(raw.etiquetas ?? [], etiquetas, (e) => e.description);
  const actorEmpresaMatch = matchMany(raw.actorEmpresas ?? [], empresas, (e) => e.razon_social);
  const demandadoEmpresaMatch = matchMany(
    raw.demandadoEmpresas ?? [],
    empresas,
    (e) => e.razon_social
  );

  if (rubroMatch.unmatched.length) {
    warnings.push(`Rubros sin coincidencia: ${rubroMatch.unmatched.join(', ')}`);
  }
  if (causaMatch.unmatched.length) {
    warnings.push(`Causas sin coincidencia: ${causaMatch.unmatched.join(', ')}`);
  }
  if (etiquetaMatch.unmatched.length) {
    warnings.push(`Etiquetas sin coincidencia: ${etiquetaMatch.unmatched.join(', ')}`);
  }
  if (actorEmpresaMatch.unmatched.length) {
    warnings.push(`Empresas actoras sin coincidencia: ${actorEmpresaMatch.unmatched.join(', ')}`);
  }
  if (demandadoEmpresaMatch.unmatched.length) {
    warnings.push(
      `Empresas demandadas sin coincidencia: ${demandadoEmpresaMatch.unmatched.join(', ')}`
    );
  }

  const tipoJuicio = findBestMatch(raw.tipoJuicio, tiposJuicio, (t) => t.nombre);
  if (raw.tipoJuicio && !tipoJuicio) {
    warnings.push(`Tipo de juicio no encontrado: ${raw.tipoJuicio}`);
  }

  const provincia = resolveProvincia(raw, provincias);
  if (!provincia) {
    if (raw.provincia) {
      warnings.push(`Provincia no encontrada: ${raw.provincia}`);
    } else if (isFederalJurisdiction(jurisdictionContext(raw))) {
      warnings.push('Provincia "Justicia Federal" no encontrada en el catálogo');
    } else if (isNacionalJurisdiction(jurisdictionContext(raw))) {
      warnings.push('Provincia "Justicia Nacional" no encontrada en el catálogo');
    }
  }

  let ciudadId = '';
  let juzgadoId = '';
  if (provincia) {
    const ciudades = await getCiudadesFromFirestore(provincia.id);
    const ciudadQuery = raw.ciudad?.trim() || extractCityFromJuzgado(raw.juzgado);
    const ciudad = findBestMatch(ciudadQuery, ciudades, (c) => c.nombre);
    if (ciudadQuery && !ciudad) {
      warnings.push(`Ciudad no encontrada: ${ciudadQuery}`);
    }
    if (ciudad) {
      ciudadId = String(ciudad.id);
      const juzgados = await getJuzgadosFromFirestore(ciudad.id);
      const juzgado = findBestMatch(raw.juzgado, juzgados, (j) => j.nombre);
      if (juzgado) {
        juzgadoId = String(juzgado.id);
      } else if (raw.juzgado) {
        const juzgadosEnProvincia = (
          await Promise.all(ciudades.map((c) => getJuzgadosFromFirestore(c.id)))
        ).flat();
        const juzgadoEnProvincia = findBestMatch(
          raw.juzgado,
          juzgadosEnProvincia,
          (j) => j.nombre
        );
        if (juzgadoEnProvincia) {
          juzgadoId = String(juzgadoEnProvincia.id);
          const ciudadDelJuzgado = ciudades.find((c) => c.id === juzgadoEnProvincia.idCiudad);
          if (ciudadDelJuzgado) ciudadId = String(ciudadDelJuzgado.id);
        } else {
          warnings.push(`Tribunal no encontrado: ${raw.juzgado}`);
        }
      }
    } else if (raw.juzgado) {
      const juzgadosEnProvincia = (
        await Promise.all(ciudades.map((c) => getJuzgadosFromFirestore(c.id)))
      ).flat();
      const juzgadoEnProvincia = findBestMatch(raw.juzgado, juzgadosEnProvincia, (j) => j.nombre);
      if (juzgadoEnProvincia) {
        juzgadoId = String(juzgadoEnProvincia.id);
        const ciudadDelJuzgado = ciudades.find((c) => c.id === juzgadoEnProvincia.idCiudad);
        if (ciudadDelJuzgado) ciudadId = String(ciudadDelJuzgado.id);
      } else {
        warnings.push(`Tribunal (completar manualmente): ${raw.juzgado}`);
      }
    }
  } else if (raw.juzgado) {
    warnings.push(`Tribunal (completar manualmente): ${raw.juzgado}`);
  }

  const resolvedDivisaCodigo = resolveDivisaCodigoFromText(raw.divisaCodigo);

  const divisa =
    findBestMatch(resolvedDivisaCodigo, divisas, (d) => d.codigo) ??
    findBestMatch(resolvedDivisaCodigo, divisas, (d) => d.nombre) ??
    findBestMatch(raw.divisaCodigo, divisas, (d) => d.codigo) ??
    findBestMatch(raw.divisaCodigo, divisas, (d) => d.nombre) ??
    (resolvedDivisaCodigo === DIVISA_CANASTA_CODIGO
      ? divisas.find((d) => d.codigo.toUpperCase() === DIVISA_CANASTA_CODIGO)
      : null) ??
    divisas.find((d) => d.codigo === DIVISA_PESOS_CODIGO) ??
    null;

  const fecha = normalizeFecha(raw.fecha);
  if (raw.fecha && !fecha) {
    warnings.push('Fecha no reconocida; completar manualmente');
  }

  const firmActor = Boolean(raw.firmActor);
  const personDemandado = Boolean(raw.personDemandado);

  if (!resumen) {
    warnings.push('No se pudo generar el resumen; redactalo manualmente');
  } else if (!resumenExtraction.hayResolucionSustantiva) {
    warnings.push(
      'El PDF parece contener solo trámite procesal, sin resolución sustantiva. Revisá el resumen o cargá la sentencia definitiva'
    );
  } else if (resumenSoundsProcedural(resumen)) {
    warnings.push(
      'El resumen parece describir trámite procesal; revisalo para destacar hechos, defensa de la contraria y qué resolvió el tribunal'
    );
  }

  const form: FalloAiExtractedForm = {
    actor: firmActor ? '' : String(raw.actor ?? '').trim(),
    demandado: personDemandado ? String(raw.demandado ?? '').trim() : '',
    firmActor,
    personDemandado,
    resumen,
    fecha,
    punitivo: formatAmount(raw.punitivo),
    moral: formatAmount(raw.moral),
    patrimonial: formatAmount(raw.patrimonial),
    divisaId: divisa ? String(divisa.id) : '7',
    tipoJuicioId: tipoJuicio ? String(tipoJuicio.id) : '',
    rubroIds: rubroMatch.ids.map(String),
    causaIds: causaMatch.ids.map(String),
    etiquetaIds: etiquetaMatch.ids.map(String),
    actorEmpresaIds: actorEmpresaMatch.ids.map(String),
    demandadoEmpresaIds: demandadoEmpresaMatch.ids.map(String),
    provinciaId: provincia ? String(provincia.id) : '',
    ciudadId,
    juzgadoId,
  };

  return { form, warnings };
}
