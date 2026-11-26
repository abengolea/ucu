import { getAdminStorage } from '@/lib/firebase-admin';
import { slugify } from '@/lib/slug';
import type { InvestigacionDocument, InvestigacionStatus } from '@/types/investigaciones';

export const INVESTIGACIONES_COLLECTION = 'investigaciones';
const FIRESTORE_HTML_LIMIT = 700_000;

export type ParsedInvestigacionForm = {
  title: string;
  excerpt: string;
  requestedSlug: string;
  empresaNombre: string;
  empresaId: number | null;
  memberName: string;
  aiName: string;
  originalUrl?: string;
  html: string;
  status: InvestigacionStatus;
  publishedAt?: string;
};

export async function parseInvestigacionForm(
  form: FormData
): Promise<ParsedInvestigacionForm> {
  const statusRaw = String(form.get('status') || 'publish');
  const empresaIdRaw = String(form.get('empresaId') || '').trim();
  const empresaId = Number(empresaIdRaw);
  const file = form.get('htmlFile');
  let html = String(form.get('html') || '');

  if (file instanceof File && file.size > 0) {
    html = await file.text();
  }

  const originalUrl = String(form.get('originalUrl') || '').trim();

  return {
    title: String(form.get('title') || '').trim(),
    excerpt: String(form.get('excerpt') || '').trim(),
    requestedSlug: String(form.get('slug') || '').trim(),
    empresaNombre: String(form.get('empresaNombre') || '').trim(),
    empresaId: Number.isFinite(empresaId) && empresaId > 0 ? empresaId : null,
    memberName: String(form.get('memberName') || '').trim(),
    aiName: String(form.get('aiName') || '').trim(),
    originalUrl: originalUrl || undefined,
    html,
    status: statusRaw === 'draft' ? 'draft' : 'publish',
    publishedAt: String(form.get('publishedAt') || '').trim() || undefined,
  };
}

export async function uniqueInvestigacionSlug(
  db: FirebaseFirestore.Firestore,
  base: string,
  excludeSlug?: string
): Promise<string> {
  let slug = slugify(base) || 'investigacion';
  let suffix = 0;

  while (true) {
    const candidate = suffix ? `${slug}-${suffix}` : slug;
    if (candidate === excludeSlug) return candidate;
    const doc = await db.collection(INVESTIGACIONES_COLLECTION).doc(candidate).get();
    if (!doc.exists) return candidate;
    suffix += 1;
  }
}

export async function persistInvestigacionHtml(
  slug: string,
  html: string,
  previousPath?: string
): Promise<{ html: string; htmlStoragePath?: string }> {
  if (html.length <= FIRESTORE_HTML_LIMIT) {
    if (previousPath) {
      await deleteInvestigacionHtmlFile(previousPath).catch(() => undefined);
    }
    return { html };
  }

  const storage = getAdminStorage();
  if (!storage) {
    throw new Error(
      'El HTML es demasiado grande para Firestore y Storage no está configurado.'
    );
  }

  const storagePath = `investigaciones/${slug}/content.html`;
  const bucket = storage.bucket();
  await bucket.file(storagePath).save(Buffer.from(html, 'utf8'), {
    metadata: {
      contentType: 'text/html; charset=utf-8',
      cacheControl: 'private, max-age=0',
    },
  });

  if (previousPath && previousPath !== storagePath) {
    await deleteInvestigacionHtmlFile(previousPath).catch(() => undefined);
  }

  return { html: '', htmlStoragePath: storagePath };
}

export async function deleteInvestigacionHtmlFile(storagePath: string) {
  const storage = getAdminStorage();
  if (!storage || !storagePath) return;
  await storage.bucket().file(storagePath).delete({ ignoreNotFound: true });
}

export function buildInvestigacionDocument(input: {
  title: string;
  slug: string;
  excerpt: string;
  empresaNombre: string;
  empresaId: number | null;
  memberName: string;
  aiName: string;
  originalUrl?: string;
  html: string;
  htmlStoragePath?: string;
  isFullDocument: boolean;
  status: InvestigacionStatus;
  publishedAt: string;
  modifiedAt: string;
}): InvestigacionDocument {
  return {
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt,
    empresaNombre: input.empresaNombre,
    empresaId: input.empresaId,
    memberName: input.memberName,
    aiName: input.aiName,
    html: input.html,
    status: input.status,
    publishedAt: input.publishedAt,
    modifiedAt: input.modifiedAt,
    isFullDocument: input.isFullDocument,
    ...(input.originalUrl ? { originalUrl: input.originalUrl } : {}),
    ...(input.htmlStoragePath ? { htmlStoragePath: input.htmlStoragePath } : {}),
  };
}
