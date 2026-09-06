import { EDUCATION_MODULES } from '@/lib/educacion-financiera/modules';
import snapshotPaths from '@/data/sitemap-paths.json';

export const SITEMAP_BASE_URL = 'https://ucu.org.ar';

export type StaticSitemapRoute = {
  path: string;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
};

export const STATIC_SITEMAP_ROUTES: StaticSitemapRoute[] = [
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
  { path: '/preguntas-frecuentes', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/quienes-somos', changeFrequency: 'monthly', priority: 0.8 },
];

export function educationSitemapRoutes(): StaticSitemapRoute[] {
  return EDUCATION_MODULES.map((mod) => ({
    path: `/educacion-financiera/${mod.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }));
}

function inferSnapshotRoute(path: string): StaticSitemapRoute {
  if (path.startsWith('/posts/')) {
    return { path, changeFrequency: 'weekly', priority: 0.7 };
  }
  if (path.startsWith('/observatorio/fallo/')) {
    return { path, changeFrequency: 'monthly', priority: 0.65 };
  }
  if (path.startsWith('/empresas/')) {
    return { path, changeFrequency: 'weekly', priority: 0.7 };
  }
  if (path.startsWith('/paginas/')) {
    return { path, changeFrequency: 'monthly', priority: 0.5 };
  }
  if (path.startsWith('/categoria/')) {
    return { path, changeFrequency: 'weekly', priority: 0.6 };
  }
  return { path, changeFrequency: 'monthly', priority: 0.5 };
}

export function allSitemapRoutes(): StaticSitemapRoute[] {
  const routes = [
    ...STATIC_SITEMAP_ROUTES,
    ...educationSitemapRoutes(),
    ...(snapshotPaths as string[]).map(inferSnapshotRoute),
  ];
  const seen = new Set<string>();
  return routes.filter((route) => {
    if (seen.has(route.path)) return false;
    seen.add(route.path);
    return true;
  });
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatPriority(value: number): string {
  return String(Math.round(value * 100) / 100);
}

export function buildStaticSitemapXml(lastModified = new Date()): string {
  const base = SITEMAP_BASE_URL;
  const lastmod = Number.isFinite(lastModified.getTime())
    ? lastModified.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const seen = new Set<string>();
  const routes = allSitemapRoutes();
  const urls = routes
    .map((route) => {
      const loc = `${base}${route.path}`;
      if (seen.has(loc)) return '';
      seen.add(loc);
      return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${route.changeFrequency}</changefreq>
    <priority>${formatPriority(route.priority)}</priority>
  </url>`;
    })
    .filter(Boolean)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export const MINIMAL_SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITEMAP_BASE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITEMAP_BASE_URL}/preguntas-frecuentes</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${SITEMAP_BASE_URL}/observatorio</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${SITEMAP_BASE_URL}/educacion-financiera</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
`;
