import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAdminPermission } from '@/lib/admin-session';
import {
  buildPostDocument,
  parsePostForm,
  resolveCategories,
  resolveTags,
  uniqueSlug,
  uploadFeaturedImage,
  upsertTags,
} from '@/lib/admin-posts-server';
import type { ContentDocument } from '@/types/content';

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

  const doc = await db.collection('posts').doc(slug).get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 });
  }

  return NextResponse.json({ post: doc.data() as ContentDocument });
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

  const existingDoc = await db.collection('posts').doc(originalSlug).get();
  if (!existingDoc.exists) {
    return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 });
  }

  const existing = existingDoc.data() as ContentDocument;
  const parsed = parsePostForm(await request.formData());

  if (!parsed.title || !parsed.content) {
    return NextResponse.json({ error: 'Título y contenido son obligatorios' }, { status: 400 });
  }

  const newSlug = await uniqueSlug(
    db,
    parsed.requestedSlug || parsed.title,
    originalSlug
  );

  const categories = await resolveCategories(db, parsed.categorySlugs);
  const tags = resolveTags(parsed.tagNames);
  const now = new Date().toISOString();

  let featuredImage = existing.featuredImage;
  if (parsed.removeFeaturedImage) {
    featuredImage = null;
  }
  if (parsed.image) {
    featuredImage = await uploadFeaturedImage(newSlug, parsed.title, parsed.image);
  }

  const post = buildPostDocument({
    title: parsed.title,
    slug: newSlug,
    content: parsed.content,
    excerpt: parsed.excerpt,
    status: parsed.status,
    categories,
    tags,
    featuredImage,
    publishedAt: parsed.publishedAt || existing.publishedAt,
    modifiedAt: now,
    author: existing.author,
    wpId: existing.wpId,
    originalLink: parsed.originalLink,
    sourceName: parsed.sourceName,
  });

  const batch = db.batch();
  batch.set(db.collection('posts').doc(newSlug), post);

  if (newSlug !== originalSlug) {
    batch.delete(db.collection('posts').doc(originalSlug));
  }

  await batch.commit();
  await upsertTags(db, tags);

  return NextResponse.json({
    ok: true,
    slug: newSlug,
    url: `/posts/${newSlug}`,
    redirect: `/admin/posts/${newSlug}/editar`,
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

  await db.collection('posts').doc(slug).delete();
  return NextResponse.json({ ok: true });
}
