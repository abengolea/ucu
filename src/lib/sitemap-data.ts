import 'server-only';

import { getAdminDb } from '@/lib/firebase-admin';
import { EDUCATION_MODULES } from '@/lib/educacion-financiera/modules';
import type { ContentDocument } from '@/types/content';
import type { PublicEmpresaStats } from '@/types/informes';
import { isFirebaseConfigured } from '@/lib/utils';

const DEDICATED_PAGE_SLUGS = new Set(['planes-de-ahorro-son-una-trampa']);

export type SitemapEntry = {
  path: string;
  lastModified: Date;
};

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

export function coerceSitemapDate(value: unknown): Date {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    try {
      const converted = (value as { toDate: () => Date }).toDate();
      if (converted instanceof Date && Number.isFinite(converted.getTime())) return converted;
    } catch {
      /* ignore */
    }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) return parsed;
  }
  return new Date();
}

export function educationModuleSitemapEntries(): SitemapEntry[] {
  const now = new Date();
  return EDUCATION_MODULES.map((mod) => ({
    path: `/educacion-financiera/${mod.slug}`,
    lastModified: now,
  }));
}

export async function getPostSitemapEntries(limit = 250): Promise<SitemapEntry[]> {
  if (!isFirebaseConfigured()) return [];
  const db = getAdminDb();
  if (!db) return [];

  return withTimeout(
    (async () => {
      try {
        const snap = await db
          .collection('posts')
          .orderBy('publishedAt', 'desc')
          .limit(Math.min(limit * 2, 400))
          .select('slug', 'status', 'modifiedAt', 'publishedAt')
          .get();

        const entries: SitemapEntry[] = [];
        for (const doc of snap.docs) {
          const data = doc.data() as Pick<
            ContentDocument,
            'slug' | 'status' | 'modifiedAt' | 'publishedAt'
          >;
          if (data.status && data.status !== 'publish') continue;
          const slug = data.slug || doc.id;
          if (!slug) continue;
          entries.push({
            path: `/posts/${slug}`,
            lastModified: coerceSitemapDate(data.modifiedAt || data.publishedAt),
          });
          if (entries.length >= limit) break;
        }
        return entries;
      } catch (error) {
        console.error('[sitemap] posts query failed', error);
        return [];
      }
    })(),
    8000,
    []
  );
}

export async function getPageSitemapEntries(limit = 80): Promise<SitemapEntry[]> {
  if (!isFirebaseConfigured()) return [];
  const db = getAdminDb();
  if (!db) return [];

  return withTimeout(
    (async () => {
      const snap = await db.collection('pages').limit(limit).get();
      const entries: SitemapEntry[] = [];
      for (const doc of snap.docs) {
        const data = doc.data() as ContentDocument;
        const slug = data.slug || doc.id;
        if (!slug || DEDICATED_PAGE_SLUGS.has(slug)) continue;
        if (data.status && data.status !== 'publish') continue;
        entries.push({
          path: `/paginas/${slug}`,
          lastModified: coerceSitemapDate(data.modifiedAt || data.publishedAt),
        });
      }
      return entries;
    })(),
    5000,
    []
  );
}

export async function getCategorySitemapEntries(): Promise<SitemapEntry[]> {
  if (!isFirebaseConfigured()) return [];
  const db = getAdminDb();
  if (!db) return [];

  return withTimeout(
    (async () => {
      const snap = await db.collection('categories').get();
      const now = new Date();
      return snap.docs
        .map((doc) => {
          const slug = (doc.data() as { slug?: string }).slug || doc.id;
          return slug ? { path: `/categoria/${slug}`, lastModified: now } : null;
        })
        .filter((entry): entry is SitemapEntry => Boolean(entry));
    })(),
    5000,
    []
  );
}

export async function getFalloSitemapEntries(limit = 400): Promise<SitemapEntry[]> {
  if (!isFirebaseConfigured()) return [];
  const db = getAdminDb();
  if (!db) return [];

  return withTimeout(
    (async () => {
      try {
        const snap = await db
          .collection('fallos')
          .where('status', '==', 'publish')
          .limit(limit)
          .select('nroExpediente', 'updatedAt', 'createdAt')
          .get();

        const entries: SitemapEntry[] = [];
        for (const doc of snap.docs) {
          const data = doc.data() as {
            nroExpediente?: number;
            updatedAt?: unknown;
            createdAt?: unknown;
          };
          const id = Number(data.nroExpediente ?? doc.id);
          if (!Number.isFinite(id) || id <= 0) continue;
          entries.push({
            path: `/observatorio/fallo/${id}`,
            lastModified: coerceSitemapDate(data.updatedAt || data.createdAt),
          });
        }
        return entries;
      } catch (error) {
        console.error('[sitemap] fallos query failed', error);
        return [];
      }
    })(),
    8000,
    []
  );
}

export async function getEmpresaSitemapEntries(limit = 200): Promise<SitemapEntry[]> {
  if (!isFirebaseConfigured()) return [];
  const db = getAdminDb();
  if (!db) return [];

  return withTimeout(
    (async () => {
      const snap = await db.collection('empresa_stats_public').limit(limit).get();
      const entries: SitemapEntry[] = [];
      for (const doc of snap.docs) {
        const data = doc.data() as PublicEmpresaStats;
        const id = Number(data.empresaId ?? doc.id);
        if (!Number.isFinite(id) || id <= 0) continue;
        if (!data.stats || data.stats.total < 1) continue;
        entries.push({
          path: `/empresas/${id}`,
          lastModified: coerceSitemapDate(data.cachedAt),
        });
      }
      return entries;
    })(),
    5000,
    []
  );
}
