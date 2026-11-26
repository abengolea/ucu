import 'server-only';

import { getAdminDb, getAdminStorage } from '@/lib/firebase-admin';
import type {
  InvestigacionDocument,
  InvestigacionListItem,
} from '@/types/investigaciones';

const COLLECTION = 'investigaciones';

const LIST_FIELDS = [
  'slug',
  'title',
  'excerpt',
  'empresaNombre',
  'empresaId',
  'memberName',
  'aiName',
  'originalUrl',
  'status',
  'publishedAt',
  'modifiedAt',
] as const;

function dbOrThrow() {
  const db = getAdminDb();
  if (!db) {
    throw new Error(
      'Firebase Admin no configurado. Completá .env.local con las credenciales.'
    );
  }
  return db;
}

export function isFullHtmlDocument(html: string): boolean {
  const head = html.slice(0, 4000);
  return /<!doctype\s+html/i.test(head) || /<html[\s>]/i.test(head);
}

function toListItem(data: InvestigacionDocument, fallbackSlug: string): InvestigacionListItem {
  return {
    slug: data.slug || fallbackSlug,
    title: data.title,
    excerpt: data.excerpt || '',
    empresaNombre: data.empresaNombre,
    empresaId: data.empresaId ?? null,
    memberName: data.memberName,
    aiName: data.aiName,
    originalUrl: data.originalUrl,
    status: data.status,
    publishedAt: data.publishedAt,
    modifiedAt: data.modifiedAt,
  };
}

function publishedOnly(items: InvestigacionListItem[]): InvestigacionListItem[] {
  return items
    .filter((item) => item.status === 'publish')
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
}

export async function getPublishedInvestigaciones(
  limit = 50
): Promise<InvestigacionListItem[]> {
  const db = dbOrThrow();
  const capped = Math.min(Math.max(limit * 2, 24), 200);

  try {
    const snap = await db
      .collection(COLLECTION)
      .orderBy('publishedAt', 'desc')
      .limit(capped)
      .select(...LIST_FIELDS)
      .get();
    const items = snap.docs.map((doc) =>
      toListItem(doc.data() as InvestigacionDocument, doc.id)
    );
    return publishedOnly(items).slice(0, limit);
  } catch {
    const snap = await db.collection(COLLECTION).limit(capped).get();
    const items = snap.docs.map((doc) =>
      toListItem(doc.data() as InvestigacionDocument, doc.id)
    );
    return publishedOnly(items).slice(0, limit);
  }
}

export async function getInvestigacionBySlug(
  slug: string
): Promise<InvestigacionDocument | null> {
  const db = dbOrThrow();
  const doc = await db.collection(COLLECTION).doc(slug).get();
  if (!doc.exists) return null;
  const data = doc.data() as InvestigacionDocument;
  if (data.status !== 'publish') return null;
  return { ...data, slug: data.slug || doc.id };
}

export async function loadInvestigacionHtml(
  investigacion: Pick<InvestigacionDocument, 'html' | 'htmlStoragePath'>
): Promise<string> {
  if (investigacion.html?.trim()) return investigacion.html;
  if (!investigacion.htmlStoragePath) return '';

  const storage = getAdminStorage();
  if (!storage) {
    throw new Error('Storage no configurado para leer la investigación');
  }

  const [buffer] = await storage.bucket().file(investigacion.htmlStoragePath).download();
  return buffer.toString('utf8');
}

export function wrapInvestigacionHtml(html: string, title: string): string {
  const trimmed = html.trim();
  if (!trimmed) {
    return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body></body></html>`;
  }

  if (isFullHtmlDocument(trimmed)) {
    return trimmed;
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    html, body { margin: 0; min-height: 100%; }
    body {
      font-family: Georgia, "Times New Roman", serif;
      color: #2b2b2b;
      line-height: 1.65;
      padding: 1.5rem 1.25rem 3rem;
    }
    img, svg, canvas, iframe, video { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; }
  </style>
</head>
<body>
${trimmed}
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
