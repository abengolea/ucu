import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAdminPermission } from '@/lib/admin-session';
import {
  INVESTIGACIONES_COLLECTION,
  buildInvestigacionDocument,
  deleteInvestigacionHtmlFile,
  parseInvestigacionForm,
  persistInvestigacionHtml,
  uniqueInvestigacionSlug,
} from '@/lib/admin-investigaciones-server';
import { isFullHtmlDocument, loadInvestigacionHtml } from '@/lib/investigaciones';
import type { InvestigacionDocument } from '@/types/investigaciones';

export const runtime = 'nodejs';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  if (!requireAdminPermission(request, 'posts:read')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { slug } = await context.params;
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: 'Firebase no configurado' }, { status: 500 });
  }

  const doc = await db.collection(INVESTIGACIONES_COLLECTION).doc(slug).get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'Investigación no encontrada' }, { status: 404 });
  }

  const investigacion = doc.data() as InvestigacionDocument;
  const html = await loadInvestigacionHtml(investigacion).catch(() => investigacion.html || '');

  return NextResponse.json({
    investigacion: {
      ...investigacion,
      slug: investigacion.slug || doc.id,
      html,
    },
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!requireAdminPermission(request, 'posts:write')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { slug: originalSlug } = await context.params;
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: 'Firebase no configurado' }, { status: 500 });
  }

  const existingDoc = await db.collection(INVESTIGACIONES_COLLECTION).doc(originalSlug).get();
  if (!existingDoc.exists) {
    return NextResponse.json({ error: 'Investigación no encontrada' }, { status: 404 });
  }

  const existing = existingDoc.data() as InvestigacionDocument;
  const parsed = await parseInvestigacionForm(await request.formData());

  if (!parsed.title || !parsed.empresaNombre || !parsed.memberName || !parsed.aiName) {
    return NextResponse.json(
      { error: 'Título, empresa, miembro e IA son obligatorios' },
      { status: 400 }
    );
  }

  if (!parsed.html.trim()) {
    return NextResponse.json(
      { error: 'Pegá el HTML de la investigación o subí el archivo .html' },
      { status: 400 }
    );
  }

  const newSlug = await uniqueInvestigacionSlug(
    db,
    parsed.requestedSlug || parsed.title,
    originalSlug
  );
  const now = new Date().toISOString();
  const stored = await persistInvestigacionHtml(
    newSlug,
    parsed.html,
    existing.htmlStoragePath
  );

  const investigacion = buildInvestigacionDocument({
    title: parsed.title,
    slug: newSlug,
    excerpt: parsed.excerpt,
    empresaNombre: parsed.empresaNombre,
    empresaId: parsed.empresaId,
    memberName: parsed.memberName,
    aiName: parsed.aiName,
    originalUrl: parsed.originalUrl,
    html: stored.html,
    htmlStoragePath: stored.htmlStoragePath,
    isFullDocument: isFullHtmlDocument(parsed.html),
    status: parsed.status,
    publishedAt: parsed.publishedAt || existing.publishedAt,
    modifiedAt: now,
  });

  const batch = db.batch();
  batch.set(db.collection(INVESTIGACIONES_COLLECTION).doc(newSlug), investigacion);
  if (newSlug !== originalSlug) {
    batch.delete(db.collection(INVESTIGACIONES_COLLECTION).doc(originalSlug));
  }
  await batch.commit();

  if (investigacion.status === 'publish') {
    const { notifyIndexNow } = await import('@/lib/indexnow');
    notifyIndexNow([`/investigaciones/${newSlug}`]);
  }

  return NextResponse.json({
    ok: true,
    slug: newSlug,
    url: `/investigaciones/${newSlug}`,
    redirect: `/admin/investigaciones/${newSlug}/editar`,
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!requireAdminPermission(request, 'posts:write')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { slug } = await context.params;
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: 'Firebase no configurado' }, { status: 500 });
  }

  const doc = await db.collection(INVESTIGACIONES_COLLECTION).doc(slug).get();
  if (doc.exists) {
    const data = doc.data() as InvestigacionDocument;
    if (data.htmlStoragePath) {
      await deleteInvestigacionHtmlFile(data.htmlStoragePath).catch(() => undefined);
    }
  }

  await db.collection(INVESTIGACIONES_COLLECTION).doc(slug).delete();
  return NextResponse.json({ ok: true });
}
