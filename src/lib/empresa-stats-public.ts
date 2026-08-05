import 'server-only';

import { getAdminDb } from '@/lib/firebase-admin';
import { searchReclamosIndex } from '@/lib/reclamos-search-index';
import { getReclamoEmpresasByIds } from '@/lib/reclamos-store';
import type { PublicEmpresaStats } from '@/types/informes';

const CACHE_COLLECTION = 'empresa_stats_public';
const CACHE_TTL_MS = 15 * 60 * 1000;
const memoryCache = new Map<number, { expiresAt: number; value: PublicEmpresaStats }>();

export const INFORME_MIN_CASOS = 1;

export async function getPublicEmpresaStats(empresaId: number): Promise<PublicEmpresaStats | null> {
  if (!Number.isFinite(empresaId) || empresaId <= 0) return null;

  const now = Date.now();
  const mem = memoryCache.get(empresaId);
  if (mem && mem.expiresAt > now) return mem.value;

  const db = getAdminDb();
  if (db) {
    try {
      const snap = await db.collection(CACHE_COLLECTION).doc(String(empresaId)).get();
      if (snap.exists) {
        const data = snap.data() as PublicEmpresaStats & { expiresAt?: number };
        if (typeof data.expiresAt === 'number' && data.expiresAt > now && data.stats) {
          const value: PublicEmpresaStats = {
            empresaId: data.empresaId,
            empresaNombre: data.empresaNombre,
            empresaCuit: data.empresaCuit ?? null,
            stats: {
              total: Number(data.stats.total ?? 0),
              rangoFechas: {
                desde: data.stats.rangoFechas?.desde ?? null,
                hasta: data.stats.rangoFechas?.hasta ?? null,
              },
            },
            cachedAt: data.cachedAt,
          };
          memoryCache.set(empresaId, { expiresAt: data.expiresAt, value });
          return value;
        }
      }
    } catch (error) {
      console.error('[empresa-stats] cache read failed', error);
    }
  }

  const [empresas, search] = await Promise.all([
    getReclamoEmpresasByIds([empresaId]),
    searchReclamosIndex({ empresaId }),
  ]);

  const empresa = empresas[0];
  if (!empresa) return null;

  const cachedAt = new Date().toISOString();
  const value: PublicEmpresaStats = {
    empresaId: empresa.id,
    empresaNombre: empresa.nombre,
    empresaCuit: empresa.cuit ?? null,
    stats: {
      total: search.stats.total,
      rangoFechas: search.stats.rangoFechas,
    },
    cachedAt,
  };

  const expiresAt = now + CACHE_TTL_MS;
  memoryCache.set(empresaId, { expiresAt, value });

  if (db) {
    db.collection(CACHE_COLLECTION)
      .doc(String(empresaId))
      .set({ ...value, expiresAt }, { merge: true })
      .catch((error) => console.error('[empresa-stats] cache write failed', error));
  }

  return value;
}

export function getInformePrecioCents(): number {
  const raw = process.env.INFORME_PRECIO_CENTS?.trim();
  const parsed = raw ? Number(raw) : 250000; // $2.500 ARS default (centavos)
  if (!Number.isFinite(parsed) || parsed < 100) return 250000;
  return Math.round(parsed);
}

export function formatPrecioArs(cents: number): string {
  const pesos = cents / 100;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(pesos);
}
