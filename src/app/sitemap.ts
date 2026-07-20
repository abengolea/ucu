import type { MetadataRoute } from 'next';
import { getAllPosts, getCategories } from '@/lib/content';
import { getSiteUrl } from '@/lib/seo';
import { isFirebaseConfigured } from '@/lib/utils';

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/posts', changeFrequency: 'daily', priority: 0.9 },
  { path: '/categorias', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/reclamos', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/reclamos/nuevo', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/reclamos/consultar', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/observatorio', changeFrequency: 'daily', priority: 0.9 },
  { path: '/observatorio/buscar', changeFrequency: 'daily', priority: 0.8 },
  {
    path: '/planes-de-ahorro-son-una-trampa',
    changeFrequency: 'weekly',
    priority: 0.95,
  },
  {
    path: '/planes-de-ahorro-son-una-trampa/preguntas-frecuentes',
    changeFrequency: 'monthly',
    priority: 0.85,
  },
  { path: '/categoria/alertas-de-fraude', changeFrequency: 'weekly', priority: 0.8 },
  {
    path: '/categoria/acciones-colectivas',
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    path: '/categoria/planes-de-ahorros',
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    path: '/educacion-financiera',
    changeFrequency: 'monthly',
    priority: 0.85,
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${base}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  if (!isFirebaseConfigured()) {
    return entries;
  }

  try {
    const [posts, categories] = await Promise.all([
      getAllPosts(500),
      getCategories(),
    ]);

    for (const post of posts) {
      entries.push({
        url: `${base}/posts/${post.slug}`,
        lastModified: post.modifiedAt ? new Date(post.modifiedAt) : now,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    const staticCategoryPaths = new Set(
      STATIC_ROUTES.filter((r) => r.path.startsWith('/categoria/')).map(
        (r) => r.path
      )
    );

    for (const category of categories) {
      const path = `/categoria/${category.slug}`;
      if (staticCategoryPaths.has(path)) continue;
      entries.push({
        url: `${base}${path}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  } catch {
    // Sitemap estático si Firestore no responde en build/runtime.
  }

  return entries;
}
