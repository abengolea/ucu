import { getAdminStorage } from '@/lib/firebase-admin';
import { slugify } from '@/lib/slug';
import type { ContentDocument, ContentTerm } from '@/types/content';

export type ParsedPostForm = {
  title: string;
  content: string;
  excerpt: string;
  status: 'publish' | 'draft';
  requestedSlug: string;
  categorySlugs: string[];
  tagNames: string[];
  publishedAt?: string;
  originalLink?: string;
  sourceName?: string;
  removeFeaturedImage: boolean;
  image: File | null;
};

export function parsePostForm(form: FormData): ParsedPostForm {
  const statusRaw = String(form.get('status') || 'publish');
  const imageEntry = form.get('featuredImage');

  return {
    title: String(form.get('title') || '').trim(),
    content: String(form.get('content') || '').trim(),
    excerpt: String(form.get('excerpt') || '').trim(),
    status: statusRaw === 'draft' ? 'draft' : 'publish',
    requestedSlug: String(form.get('slug') || '').trim(),
    categorySlugs: JSON.parse(String(form.get('categorySlugs') || '[]')) as string[],
    tagNames: String(form.get('tags') || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    publishedAt: String(form.get('publishedAt') || '').trim() || undefined,
    originalLink: String(form.get('originalLink') || '').trim() || undefined,
    sourceName: String(form.get('sourceName') || '').trim() || undefined,
    removeFeaturedImage: String(form.get('removeFeaturedImage') || '') === 'true',
    image: imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null,
  };
}

export async function uniqueSlug(
  db: FirebaseFirestore.Firestore,
  base: string,
  excludeSlug?: string
): Promise<string> {
  let slug = slugify(base) || 'nota';
  let suffix = 0;

  while (true) {
    const candidate = suffix ? `${slug}-${suffix}` : slug;
    if (candidate === excludeSlug) return candidate;
    const doc = await db.collection('posts').doc(candidate).get();
    if (!doc.exists) return candidate;
    suffix += 1;
  }
}

export async function resolveCategories(
  db: FirebaseFirestore.Firestore,
  categorySlugs: string[]
): Promise<ContentTerm[]> {
  const categoriesSnap = await db.collection('categories').get();
  const categoriesBySlug = new Map(
    categoriesSnap.docs.map((doc) => [doc.id, doc.data() as { slug: string; name: string }])
  );

  return categorySlugs
    .filter((s) => categoriesBySlug.has(s))
    .map((s) => {
      const cat = categoriesBySlug.get(s)!;
      return { slug: cat.slug, name: cat.name };
    });
}

export function resolveTags(tagNames: string[]): ContentTerm[] {
  return tagNames.map((name) => ({
    slug: slugify(name),
    name,
  }));
}

export async function uploadFeaturedImage(
  slug: string,
  title: string,
  image: File
): Promise<ContentDocument['featuredImage']> {
  const storage = getAdminStorage();
  if (!storage) throw new Error('Storage no configurado');

  const ext = image.name.split('.').pop()?.toLowerCase() || 'jpg';
  const date = new Date();
  const storagePath = `media/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${slug}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await image.arrayBuffer());
  const bucket = storage.bucket();
  const file = bucket.file(storagePath);

  await file.save(buffer, {
    metadata: {
      contentType: image.type || 'image/jpeg',
      cacheControl: 'public,max-age=31536000',
    },
  });

  return {
    url: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`,
    alt: title,
  };
}

export async function upsertTags(db: FirebaseFirestore.Firestore, tags: ContentTerm[]) {
  for (const tag of tags) {
    await db.collection('tags').doc(tag.slug).set(
      { slug: tag.slug, name: tag.name, wpTermId: 0 },
      { merge: true }
    );
  }
}

export function buildPostDocument(input: {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: 'publish' | 'draft';
  categories: ContentTerm[];
  tags: ContentTerm[];
  featuredImage: ContentDocument['featuredImage'];
  publishedAt: string;
  modifiedAt: string;
  author: ContentDocument['author'];
  wpId?: number;
  originalLink?: string;
  sourceName?: string;
}): ContentDocument {
  return {
    wpId: input.wpId ?? 0,
    title: input.title,
    slug: input.slug,
    content: input.content,
    excerpt: input.excerpt,
    status: input.status,
    publishedAt: input.publishedAt,
    modifiedAt: input.modifiedAt,
    author: input.author,
    categories: input.categories,
    tags: input.tags,
    categorySlugs: input.categories.map((c) => c.slug),
    tagSlugs: input.tags.map((t) => t.slug),
    featuredImage: input.featuredImage,
    type: 'post',
    ...(input.originalLink ? { originalLink: input.originalLink } : {}),
    ...(input.sourceName ? { sourceName: input.sourceName } : {}),
  };
}
