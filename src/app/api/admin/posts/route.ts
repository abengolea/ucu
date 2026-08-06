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

export async function GET(request: NextRequest) {
  if (!requireAdminPermission(request, 'posts:read')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: 'Firebase no configurado' }, { status: 500 });
  }

  const snap = await db.collection('posts').orderBy('publishedAt', 'desc').limit(100).get();
  const posts = snap.docs.map((doc) => {
    const data = doc.data() as ContentDocument;
    return {
      slug: data.slug,
      title: data.title,
      status: data.status,
      publishedAt: data.publishedAt,
      modifiedAt: data.modifiedAt,
    };
  });

  return NextResponse.json({ posts });
}

export async function POST(request: NextRequest) {
  if (!requireAdminPermission(request, 'posts:write')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: 'Firebase no configurado' }, { status: 500 });
  }

  const parsed = parsePostForm(await request.formData());

  if (!parsed.title || !parsed.content) {
    return NextResponse.json({ error: 'Título y contenido son obligatorios' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const slug = await uniqueSlug(db, parsed.requestedSlug || parsed.title);
  const categories = await resolveCategories(db, parsed.categorySlugs);
  const tags = resolveTags(parsed.tagNames);

  let featuredImage: ContentDocument['featuredImage'] = null;
  if (parsed.image) {
    featuredImage = await uploadFeaturedImage(slug, parsed.title, parsed.image);
  }

  const post = buildPostDocument({
    title: parsed.title,
    slug,
    content: parsed.content,
    excerpt: parsed.excerpt,
    status: parsed.status,
    categories,
    tags,
    featuredImage,
    publishedAt: parsed.publishedAt || now,
    modifiedAt: now,
    author: {
      login: 'ucu-admin',
      name: 'Usuarios y Consumidores Unidos',
      email: 'info@ucu.org.ar',
    },
    originalLink: parsed.originalLink,
    sourceName: parsed.sourceName,
  });

  await db.collection('posts').doc(slug).set(post);
  await upsertTags(db, tags);

  return NextResponse.json({ ok: true, slug, url: `/posts/${slug}` });
}
