import { getAdminDb } from '@/lib/firebase-admin';
import {
  fillRelatedFallback,
  rankRelatedPosts,
  termsFromPost,
  type RelatedPostMatch,
} from '@/lib/related-posts';
import type {
  AuthorDocument,
  CategoryDocument,
  ContentDocument,
  TagDocument,
} from '@/types/content';

export type { RelatedPostMatch } from '@/lib/related-posts';

function dbOrThrow() {
  const db = getAdminDb();
  if (!db) {
    throw new Error(
      'Firebase Admin no configurado. Completá .env.local con las credenciales.'
    );
  }
  return db;
}

function mapDoc<T>(data: FirebaseFirestore.DocumentData): T {
  return data as T;
}

function publishedPosts(docs: FirebaseFirestore.QueryDocumentSnapshot[]): ContentDocument[] {
  return docs
    .map((doc) => mapDoc<ContentDocument>(doc.data()))
    .filter((post) => post.status === 'publish')
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
}

export async function getRecentPosts(limit = 12): Promise<ContentDocument[]> {
  const db = dbOrThrow();
  const snap = await db
    .collection('posts')
    .orderBy('publishedAt', 'desc')
    .limit(Math.max(limit * 2, 24))
    .get();

  return publishedPosts(snap.docs).slice(0, limit);
}

export async function getAllPosts(limit = 100): Promise<ContentDocument[]> {
  const db = dbOrThrow();
  const snap = await db
    .collection('posts')
    .orderBy('publishedAt', 'desc')
    .limit(Math.min(limit * 2, 500))
    .get();

  return publishedPosts(snap.docs).slice(0, limit);
}

export async function getPostBySlug(slug: string): Promise<ContentDocument | null> {
  const db = dbOrThrow();
  const doc = await db.collection('posts').doc(slug).get();
  if (!doc.exists) return null;
  const post = mapDoc<ContentDocument>(doc.data()!);
  return post.status === 'publish' ? post : null;
}

export async function getPageBySlug(slug: string): Promise<ContentDocument | null> {
  const db = dbOrThrow();
  const doc = await db.collection('pages').doc(slug).get();
  if (!doc.exists) return null;
  return mapDoc<ContentDocument>(doc.data()!);
}

async function queryPostsByAny(
  field: 'tagSlugs' | 'categorySlugs',
  values: string[],
  limit: number
): Promise<ContentDocument[]> {
  const slugs = [...new Set(values.filter(Boolean))].slice(0, 10);
  if (!slugs.length) return [];

  const db = dbOrThrow();
  const capped = Math.min(Math.max(limit, 12), 50);

  try {
    const snap = await db
      .collection('posts')
      .where(field, 'array-contains-any', slugs)
      .orderBy('publishedAt', 'desc')
      .limit(capped)
      .get();
    return publishedPosts(snap.docs);
  } catch {
    const snap = await db
      .collection('posts')
      .where(field, 'array-contains-any', slugs)
      .limit(capped)
      .get();
    return publishedPosts(snap.docs);
  }
}

export async function getPostsByCategory(
  categorySlug: string,
  limit = 50
): Promise<ContentDocument[]> {
  const db = dbOrThrow();
  const snap = await db
    .collection('posts')
    .where('categorySlugs', 'array-contains', categorySlug)
    .limit(Math.min(limit * 2, 200))
    .get();

  return publishedPosts(snap.docs).slice(0, limit);
}

export async function getPostsByTag(
  tagSlug: string,
  limit = 50
): Promise<ContentDocument[]> {
  const db = dbOrThrow();
  const snap = await db
    .collection('posts')
    .where('tagSlugs', 'array-contains', tagSlug)
    .limit(Math.min(limit * 2, 200))
    .get();

  return publishedPosts(snap.docs).slice(0, limit);
}

export async function getRelatedPosts(
  post: ContentDocument,
  limit = 4
): Promise<RelatedPostMatch[]> {
  const tagSlugs = termsFromPost(post.tags, post.tagSlugs).map((term) => term.slug);
  const categorySlugs = termsFromPost(post.categories, post.categorySlugs).map(
    (term) => term.slug
  );

  const [tagResult, categoryResult] = await Promise.allSettled([
    queryPostsByAny('tagSlugs', tagSlugs, 40),
    queryPostsByAny('categorySlugs', categorySlugs, 40),
  ]);

  const candidates: ContentDocument[] = [];
  if (tagResult.status === 'fulfilled') candidates.push(...tagResult.value);
  if (categoryResult.status === 'fulfilled') candidates.push(...categoryResult.value);

  let ranked = rankRelatedPosts(post, candidates, limit);
  if (ranked.length >= limit) return ranked;

  const recent = await getRecentPosts(Math.max(limit + 12, 16)).catch(() => []);
  ranked = fillRelatedFallback(ranked, recent, post.slug, limit);
  return ranked;
}

export async function getCategories(): Promise<CategoryDocument[]> {
  const db = dbOrThrow();
  const snap = await db.collection('categories').get();
  return snap.docs
    .map((doc) => mapDoc<CategoryDocument>(doc.data()))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export async function getCategory(slug: string): Promise<CategoryDocument | null> {
  const db = dbOrThrow();
  const doc = await db.collection('categories').doc(slug).get();
  if (!doc.exists) return null;
  return mapDoc<CategoryDocument>(doc.data()!);
}

export async function getTags(): Promise<TagDocument[]> {
  const db = dbOrThrow();
  const snap = await db.collection('tags').get();
  return snap.docs
    .map((doc) => mapDoc<TagDocument>(doc.data()))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export async function getTag(slug: string): Promise<TagDocument | null> {
  const db = dbOrThrow();
  const doc = await db.collection('tags').doc(slug).get();
  if (doc.exists) return mapDoc<TagDocument>(doc.data()!);

  const posts = await getPostsByTag(slug, 1).catch(() => []);
  const fromPost = posts[0]?.tags.find((tag) => tag.slug === slug);
  if (!fromPost) return null;
  return { wpTermId: 0, slug: fromPost.slug, name: fromPost.name };
}

export async function getAuthors(): Promise<AuthorDocument[]> {
  const db = dbOrThrow();
  const snap = await db.collection('authors').get();
  return snap.docs
    .map((doc) => mapDoc<AuthorDocument>(doc.data()!))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export async function hasMigratedContent(): Promise<boolean> {
  try {
    const db = getAdminDb();
    if (!db) return false;
    const meta = await db.collection('migration_meta').doc('wordpress').get();
    return meta.exists;
  } catch {
    return false;
  }
}
