import 'server-only';

import { searchReclamosIndex } from '@/lib/reclamos-search-index';
import type { InformeCausaCount, InformeStatsSnapshot } from '@/types/informes';
import type { ReclamoSearchHit } from '@/types/reclamos-search';

const MAX_CAUSAS = 12;
const MAX_MUESTRAS_IA = 15;

export function aggregatePorCausa(hits: ReclamoSearchHit[]): InformeCausaCount[] {
  const counts = new Map<string, number>();
  let sinCausa = 0;

  for (const hit of hits) {
    const causas = (hit.causaTextos ?? []).map((c) => c.trim()).filter(Boolean);
    if (!causas.length) {
      sinCausa += 1;
      continue;
    }
    for (const causa of causas) {
      counts.set(causa, (counts.get(causa) ?? 0) + 1);
    }
  }

  const list = [...counts.entries()]
    .map(([causa, count]) => ({ causa, count }))
    .sort((a, b) => b.count - a.count || a.causa.localeCompare(b.causa, 'es'));

  if (sinCausa > 0) {
    // Al final: no compite con causas tipificadas reales.
    list.push({ causa: 'Sin causa tipificada', count: sinCausa });
  }

  return list.slice(0, MAX_CAUSAS);
}

export function pickMuestrasAnonimas(hits: ReclamoSearchHit[]): string[] {
  return hits
    .slice(0, MAX_MUESTRAS_IA)
    .map((hit) => {
      const causas = (hit.causaTextos ?? []).filter(Boolean).join('; ');
      const resumen = (hit.resumen || hit.anonPreview || '').trim().slice(0, 220);
      return [causas ? `Causas: ${causas}` : null, resumen ? `Resumen: ${resumen}` : null]
        .filter(Boolean)
        .join(' · ');
    })
    .filter(Boolean);
}

/** Arma el contenido del informe pago (total + causas). La síntesis IA se agrega al cumplir el pago. */
export async function buildInformeStatsSnapshot(
  empresaId: number
): Promise<InformeStatsSnapshot | null> {
  if (!Number.isFinite(empresaId) || empresaId <= 0) return null;

  const search = await searchReclamosIndex({ empresaId });
  return {
    total: search.stats.total,
    rangoFechas: search.stats.rangoFechas,
    porCausa: aggregatePorCausa(search.hits),
    sintesis: null,
    temas: null,
  };
}

export function normalizeInformeStatsSnapshot(raw: unknown): InformeStatsSnapshot {
  const data = (raw ?? {}) as Partial<InformeStatsSnapshot> & {
    porEstado?: Record<string, number>;
    porGrupo?: Record<string, number>;
  };

  const porCausa = Array.isArray(data.porCausa)
    ? data.porCausa
        .map((item) => ({
          causa: String(item?.causa ?? '').trim(),
          count: Number(item?.count ?? 0),
        }))
        .filter((item) => item.causa && item.count > 0)
    : [];

  return {
    total: Number(data.total ?? 0),
    rangoFechas: {
      desde: data.rangoFechas?.desde ?? null,
      hasta: data.rangoFechas?.hasta ?? null,
    },
    porCausa,
    sintesis: data.sintesis ?? null,
    temas: Array.isArray(data.temas) ? data.temas.map(String) : null,
  };
}
