import { getRecentPosts } from '@/lib/content';
import { cleanText, getSiteUrl } from '@/lib/seo';
import { isFirebaseConfigured } from '@/lib/utils';

export const revalidate = 1800;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET() {
  const base = getSiteUrl();
  let items = '';

  if (isFirebaseConfigured()) {
    try {
      const posts = await getRecentPosts(30);
      items = posts
        .map((post) => {
          const url = `${base}/posts/${post.slug}`;
          const title = escapeXml(cleanText(post.title) || post.slug);
          const description = escapeXml(cleanText(post.excerpt));
          const pubDate = new Date(post.publishedAt || post.modifiedAt).toUTCString();
          return `<item>
      <title>${title}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${pubDate}</pubDate>
      ${description ? `<description>${description}</description>` : ''}
    </item>`;
        })
        .join('\n    ');
    } catch (error) {
      console.error('[feed.xml]', error);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>UCU — Usuarios y Consumidores Unidos</title>
    <link>${base}</link>
    <description>Noticias, alertas y campañas de defensa del consumidor en Argentina.</description>
    <language>es-ar</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400',
    },
  });
}
