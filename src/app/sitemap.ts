import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo';
import {
  educationModuleSitemapEntries,
  getCategorySitemapEntries,
  getEmpresaSitemapEntries,
  getFalloSitemapEntries,
  getPageSitemapEntries,
  getPostSitemapEntries,
} from '@/lib/sitemap-data';

export const revalidate = 3600;

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
  { path: '/reclamos/estadisticas', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/verificar', changeFrequency: 'monthly', priority: 0.6 },
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
  { path: '/feed.xml', changeFrequency: 'daily', priority: 0.4 },
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

  const seen = new Set(entries.map((entry) => entry.url));

  const push = (
    path: string,
    lastModified: Date,
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
    priority: number
  ) => {
    const url = `${base}${path}`;
    if (seen.has(url)) return;
    seen.add(url);
    entries.push({ url, lastModified, changeFrequency, priority });
  };

  try {
    const [posts, categories, pages, fallos, empresas] = await Promise.all([
      getPostSitemapEntries(250),
      getCategorySitemapEntries(),
      getPageSitemapEntries(),
      getFalloSitemapEntries(400),
      getEmpresaSitemapEntries(200),
    ]);

    for (const post of posts) {
      push(post.path, post.lastModified, 'weekly', 0.7);
    }
    for (const category of categories) {
      push(category.path, category.lastModified, 'weekly', 0.6);
    }
    for (const page of pages) {
      push(page.path, page.lastModified, 'monthly', 0.5);
    }
    for (const fallo of fallos) {
      push(fallo.path, fallo.lastModified, 'monthly', 0.65);
    }
    for (const empresa of empresas) {
      push(empresa.path, empresa.lastModified, 'weekly', 0.7);
    }
    for (const mod of educationModuleSitemapEntries()) {
      push(mod.path, mod.lastModified, 'monthly', 0.75);
    }
  } catch (error) {
    console.error('[sitemap] fallback to static routes', error);
  }

  return entries;
}
