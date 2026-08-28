import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo';

const DISALLOW = ['/admin', '/admin/', '/api/', '/api'];

function aiRule(userAgent: string): {
  userAgent: string;
  allow: string;
  disallow: string[];
} {
  return {
    userAgent,
    allow: '/',
    disallow: DISALLOW,
  };
}

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOW,
      },
      // OpenAI: búsqueda/citas vs. entrenamiento
      aiRule('OAI-SearchBot'),
      aiRule('ChatGPT-User'),
      aiRule('GPTBot'),
      // Anthropic / Claude
      aiRule('Claude-SearchBot'),
      aiRule('Claude-User'),
      aiRule('ClaudeBot'),
      // Otros asistentes
      aiRule('Google-Extended'),
      aiRule('PerplexityBot'),
      aiRule('Applebot-Extended'),
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
