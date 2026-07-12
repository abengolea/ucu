import 'server-only';

import { getAdminDb } from '@/lib/firebase-admin';
import { normalizeSearchText } from '@/lib/text-search';
import type { ReclamoComunicacion, ReclamoComunicacionSugerencia, StoredReclamoDocument } from '@/types/reclamos';

export type { ReclamoComunicacionSugerencia };

function dbOrThrow() {
  const db = getAdminDb();
  if (!db) throw new Error('Firebase Admin no configurado.');
  return db;
}

function empresaLabel(reclamo: StoredReclamoDocument): string {
  const nombres = reclamo.empresas.map((e) => e.nombre);
  if (reclamo.otrasEmpresas) nombres.push(reclamo.otrasEmpresas);
  return nombres.join(', ') || '—';
}

function scoreSimilarity(
  current: StoredReclamoDocument,
  other: StoredReclamoDocument
): { score: number; motivos: string[] } {
  let score = 0;
  const motivos: string[] = [];

  const currentEmpresaIds = new Set(current.empresaIds);
  const empresasCompartidas = other.empresaIds.filter((id) => currentEmpresaIds.has(id));
  if (empresasCompartidas.length > 0) {
    score += empresasCompartidas.length * 35;
    motivos.push(
      empresasCompartidas.length === 1
        ? 'Misma empresa denunciada'
        : `${empresasCompartidas.length} empresas en común`
    );
  }

  const currentCausaIds = new Set((current.causas ?? []).map((c) => c.id));
  const causasCompartidas = (other.causas ?? []).filter((c) => currentCausaIds.has(c.id));
  if (causasCompartidas.length > 0) {
    score += causasCompartidas.length * 25;
    motivos.push(
      causasCompartidas.length === 1 ? 'Mismo motivo de reclamo' : 'Motivos de reclamo parecidos'
    );
  }

  if (current.idCasoEstado && current.idCasoEstado === other.idCasoEstado) {
    score += 12;
    motivos.push(`Mismo estado (${other.estadoDescripcion ?? 'Consulta'})`);
  } else if (current.idGrupoEstado && current.idGrupoEstado === other.idGrupoEstado) {
    score += 6;
    motivos.push('Mismo grupo de estado');
  }

  const currentTokens = new Set(
    normalizeSearchText(`${current.resumen} ${current.hecho}`)
      .split(/\s+/)
      .filter((token) => token.length > 3)
  );
  const otherText = normalizeSearchText(`${other.resumen} ${other.hecho}`);
  let palabrasCompartidas = 0;
  for (const token of currentTokens) {
    if (otherText.includes(token)) palabrasCompartidas += 1;
  }
  if (palabrasCompartidas >= 2) {
    score += Math.min(palabrasCompartidas * 3, 24);
    motivos.push('Resumen o hechos parecidos');
  }

  return { score, motivos };
}

function latestComunicacion(
  comunicaciones: ReclamoComunicacion[] | undefined
): ReclamoComunicacion | null {
  if (!comunicaciones?.length) return null;
  return [...comunicaciones].sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0] ?? null;
}

export async function findSimilarReclamoComunicaciones(
  current: StoredReclamoDocument,
  limit = 4
): Promise<ReclamoComunicacionSugerencia[]> {
  const snap = await dbOrThrow().collection('reclamos').get();

  const candidatos = snap.docs
    .map((doc) => doc.data() as StoredReclamoDocument)
    .filter((item) => !item.deletedAt && item.id !== current.id)
    .map((item) => {
      const comunicacion = latestComunicacion(item.comunicaciones);
      if (!comunicacion) return null;
      const { score, motivos } = scoreSimilarity(current, item);
      if (score <= 0) return null;
      return {
        reclamoId: item.id,
        resumen: item.resumen,
        empresas: empresaLabel(item),
        estadoDescripcion: item.estadoDescripcion ?? 'Consulta',
        motivos,
        score,
        comunicacion: {
          subject: comunicacion.subject,
          body: comunicacion.body,
          sentAt: comunicacion.sentAt,
          ...(comunicacion.viaIA !== undefined ? { viaIA: comunicacion.viaIA } : {}),
        },
      } as ReclamoComunicacionSugerencia;
    })
    .filter((item): item is ReclamoComunicacionSugerencia => item !== null)
    .sort((a, b) => b.score - a.score || b.comunicacion.sentAt.localeCompare(a.comunicacion.sentAt));

  return candidatos.slice(0, limit);
}
