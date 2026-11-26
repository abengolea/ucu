import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAdminPermission } from '@/lib/admin-session';
import {
  INVESTIGACIONES_COLLECTION,
  buildInvestigacionDocument,
  parseInvestigacionForm,
  persistInvestigacionHtml,
  uniqueInvestigacionSlug,
} from '@/lib/admin-investigaciones-server';
import { isFullHtmlDocument } from '@/lib/investigaciones';
import type { InvestigacionDocument } from '@/types/investigaciones';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!requireAdminPermission(request, 'posts:read')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: 'Firebase no configurado' }, { status: 500 });
  }

  let snap: FirebaseFirestore.QuerySnapshot;
  try {
    snap = await db
      .collection(INVESTIGACIONES_COLLECTION)
      .orderBy('publishedAt', 'desc')
      .limit(200)
      .get();
  } catch {
    snap = await db.collection(INVESTIGACIONES_COLLECTION).limit(200).get();
  }

  const investigaciones = snap.docs.map((doc) => {
    const data = doc.data() as InvestigacionDocument;
    return {
      slug: data.slug || doc.id,
      title: data.title,
      empresaNombre: data.empresaNombre,
      aiName: data.aiName,
      memberName: data.memberName,
      status: data.status,
      publishedAt: data.publishedAt,
      modifiedAt: data.modifiedAt,
    };
  });

  return NextResponse.json({ investigaciones });
}

export async function POST(request: NextRequest) {
  if (!requireAdminPermission(request, 'posts:write')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: 'Firebase no configurado' }, { status: 500 });
  }

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

  const now = new Date().toISOString();
  const slug = await uniqueInvestigacionSlug(db, parsed.requestedSlug || parsed.title);
  const stored = await persistInvestigacionHtml(slug, parsed.html);

  const investigacion = buildInvestigacionDocument({
    title: parsed.title,
    slug,
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
    publishedAt: parsed.publishedAt || now,
    modifiedAt: now,
  });

  await db.collection(INVESTIGACIONES_COLLECTION).doc(slug).set(investigacion);

  if (investigacion.status === 'publish') {
    const { notifyIndexNow } = await import('@/lib/indexnow');
    notifyIndexNow([`/investigaciones/${slug}`]);
  }

  return NextResponse.json({
    ok: true,
    slug,
    url: `/investigaciones/${slug}`,
  });
}
