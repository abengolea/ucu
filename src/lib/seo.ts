import type { Metadata } from 'next';
import { decodeHtmlEntities, stripHtml } from '@/lib/format';
import { resolveMediaUrl } from '@/lib/media';

export const SITE_NAME = 'UCU — Usuarios y Consumidores Unidos';
export const SITE_SHORT_NAME = 'UCU';
export const SITE_TAGLINE = 'La red de defensa del consumidor más grande del país';
export const DEFAULT_DESCRIPTION =
  'Defendé tus derechos como consumidor en Argentina: noticias, alertas de fraude, reclamos online, planes de ahorro y observatorio de fallos. Organización independiente de usuarios y consumidores.';

export const SITE_KEYWORDS = [
  'defensa del consumidor',
  'derechos del consumidor Argentina',
  'reclamos de consumo',
  'planes de ahorro',
  'alertas de fraude',
  'acciones colectivas',
  'observatorio de fallos',
  'Usuarios y Consumidores Unidos',
  'UCU',
  'Usuarios Protegidos',
] as const;

const DEFAULT_SITE_URL = 'https://ucu.org.ar';

export function getSiteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    '';

  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  }

  return DEFAULT_SITE_URL;
}

export function absoluteUrl(path = '/'): string {
  const base = getSiteUrl();
  if (!path || path === '/') return base;
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Convierte URL relativa de medios a absoluta para Open Graph / schema. */
export function absoluteMediaUrl(url?: string | null): string | undefined {
  const resolved = resolveMediaUrl(url);
  if (!resolved) return undefined;
  if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
    return resolved;
  }
  return absoluteUrl(resolved);
}

export function cleanText(value?: string | null): string {
  if (!value) return '';
  return decodeHtmlEntities(stripHtml(value)).replace(/\s+/g, ' ').trim();
}

export function truncateMeta(text: string, max = 160): string {
  const cleaned = cleanText(text);
  if (cleaned.length <= max) return cleaned;
  const sliced = cleaned.slice(0, max - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

export function excerptToDescription(
  excerpt?: string | null,
  fallback = DEFAULT_DESCRIPTION
): string {
  const fromExcerpt = truncateMeta(excerpt || '');
  return fromExcerpt || fallback;
}

type BuildMetadataInput = {
  title: string;
  description?: string;
  path?: string;
  image?: string | null;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  noIndex?: boolean;
  keywords?: string[];
  /** Si true, no aplica el template «%s — UCU» del root layout. */
  absoluteTitle?: boolean;
};

export function buildPageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image,
  type = 'website',
  publishedTime,
  modifiedTime,
  authors,
  noIndex = false,
  keywords,
  absoluteTitle = false,
}: BuildMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const desc = truncateMeta(description);
  const ogImage = absoluteMediaUrl(image) ?? absoluteUrl('/brand/logo-ucu.png');
  const fullTitle =
    absoluteTitle || title.includes('UCU') ? title : `${title} — UCU`;

  return {
    title: absoluteTitle || title.includes('UCU') ? { absolute: title } : title,
    description: desc,
    keywords: keywords?.length ? [...keywords] : [...SITE_KEYWORDS],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: fullTitle,
      description: desc,
      url,
      siteName: SITE_NAME,
      locale: 'es_AR',
      type,
      images: [
        {
          url: ogImage,
          alt: fullTitle,
        },
      ],
      ...(type === 'article'
        ? {
            publishedTime,
            modifiedTime,
            authors,
          }
        : {}),
    },
    twitter: {
      card: ogImage.includes('logo-ucu') ? 'summary' : 'summary_large_image',
      title: fullTitle,
      description: desc,
      images: [ogImage],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'NGO',
    '@id': `${getSiteUrl()}/#organization`,
    name: 'Usuarios y Consumidores Unidos',
    alternateName: ['UCU', 'Usuarios Protegidos'],
    url: getSiteUrl(),
    logo: absoluteUrl('/brand/logo-ucu.png'),
    description: DEFAULT_DESCRIPTION,
    email: 'info@ucu.org.ar',
    areaServed: {
      '@type': 'Country',
      name: 'Argentina',
    },
    sameAs: ['https://www.ucu.org.ar'],
    knowsAbout: [
      'Defensa del consumidor',
      'Planes de ahorro automotor',
      'Reclamos de consumo',
      'Acciones colectivas',
      'Jurisprudencia de consumo',
    ],
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${getSiteUrl()}/#website`,
    name: SITE_NAME,
    alternateName: SITE_SHORT_NAME,
    url: getSiteUrl(),
    description: DEFAULT_DESCRIPTION,
    inLanguage: 'es-AR',
    publisher: { '@id': `${getSiteUrl()}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${getSiteUrl()}/observatorio/buscar?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function articleJsonLd({
  title,
  description,
  path,
  image,
  publishedAt,
  modifiedAt,
  authorName,
  section,
  tags,
}: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  publishedAt?: string;
  modifiedAt?: string;
  authorName?: string;
  section?: string;
  tags?: string[];
}) {
  const imageUrl = absoluteMediaUrl(image);
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description,
    url: absoluteUrl(path),
    mainEntityOfPage: absoluteUrl(path),
    inLanguage: 'es-AR',
    datePublished: publishedAt,
    dateModified: modifiedAt || publishedAt,
    author: {
      '@type': 'Person',
      name: authorName || 'UCU',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Usuarios y Consumidores Unidos',
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/brand/logo-ucu.png'),
      },
    },
    ...(imageUrl ? { image: [imageUrl] } : {}),
    ...(section ? { articleSection: section } : {}),
    ...(tags?.length ? { keywords: tags.join(', ') } : {}),
    isAccessibleForFree: true,
  };
}

export function faqPageJsonLd(
  items: Array<{ question: string; answer: string }>,
  path: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: absoluteUrl(path),
    inLanguage: 'es-AR',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: cleanText(item.answer),
      },
    })),
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function webPageJsonLd({
  title,
  description,
  path,
  type = 'WebPage',
}: {
  title: string;
  description: string;
  path: string;
  type?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': type,
    name: title,
    description,
    url: absoluteUrl(path),
    inLanguage: 'es-AR',
    isPartOf: { '@id': `${getSiteUrl()}/#website` },
    about: { '@id': `${getSiteUrl()}/#organization` },
  };
}

export function collectionPageJsonLd({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}) {
  return webPageJsonLd({ title, description, path, type: 'CollectionPage' });
}
