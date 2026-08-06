import 'server-only';

import { decodeHtmlEntities } from '@/lib/format';

const MAX_HTML_BYTES = 3 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;

const STOP_HEADINGS = [
  'más leídas',
  'mas leidas',
  'te puede interesar',
  'notas relacionadas',
  'relacionadas',
  'también te puede',
  'tambien te puede',
  'mirá también',
  'mira tambien',
  'leé también',
  'lee tambien',
  'newsletter',
];

export type ImportedArticleImage = {
  base64: string;
  contentType: string;
  filename: string;
  sourceUrl: string;
};

export type ImportedArticle = {
  url: string;
  title: string;
  excerpt: string;
  content: string;
  sourceName: string;
  image: ImportedArticleImage | null;
  warnings: string[];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cleanText(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(
    `${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i'
  );
  const match = tag.match(re);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function getMeta(html: string, key: string): string | null {
  const metas = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metas) {
    const property = (attr(tag, 'property') || attr(tag, 'name') || '').toLowerCase();
    if (property !== key.toLowerCase()) continue;
    const content = attr(tag, 'content');
    if (content) return cleanText(content);
  }
  return null;
}

function getTitle(html: string): string {
  return (
    getMeta(html, 'og:title') ||
    getMeta(html, 'twitter:title') ||
    cleanText((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '')
  );
}

function hostnameLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, '');
    const base = host.split('.')[0] || host;
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return 'Medio';
  }
}

function assertPublicHttpUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error('URL inválida');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Solo se admiten URLs http/https');
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host === '0.0.0.0' ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    host === '::1' ||
    host.startsWith('fc') ||
    host.startsWith('fd') ||
    host.startsWith('fe80')
  ) {
    throw new Error('No se pueden importar URLs internas');
  }

  return parsed;
}

function unwrapCdnImageUrl(raw: string): string {
  // iprofesional / imgix-style resizers often wrap the real asset after filters/
  const match = raw.match(
    /\/(?:filters:[^/]+\/)?(?:https?:\/\/)?((?:assets|static|cdn|img|images|media)\.[^?\s]+\.(?:jpe?g|png|webp|gif))/i
  );
  if (match?.[1]) {
    return match[1].startsWith('http') ? match[1] : `https://${match[1]}`;
  }

  const nested = raw.match(/https?:\/\/[^?\s]+\.(?:jpe?g|png|webp|gif)/i);
  if (nested && nested[0] !== raw) return nested[0];

  return raw;
}

function absoluteUrl(base: string, maybeRelative: string): string {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return maybeRelative;
  }
}

function extractArticleChunk(html: string): string {
  const openPatterns = [
    /<(?:div|section|article)\b[^>]*class="(?:[^"]*\s)?article-content(?:\s[^"]*)?"[^>]*>/i,
    /<(?:div|section|article)\b[^>]*class="(?:[^"]*\s)?main-article(?:\s[^"]*)?"[^>]*>/i,
    /<(?:div|section|article)\b[^>]*class="(?:[^"]*\s)?(?:entry-content|post-content|nota-body|article-body|article__body)(?:\s[^"]*)?"[^>]*>/i,
    /<article\b[^>]*>/i,
    /<main\b[^>]*>/i,
  ];

  for (const pattern of openPatterns) {
    const match = html.match(pattern);
    if (!match || match.index == null) continue;

    const from = html.slice(match.index, match.index + 100_000);
    const stop = from.search(
      /Más leídas|Mas leidas|te puede interesar|notas relacionadas|también te puede|tambien te puede|mirá también|mira tambien|newsletter/i
    );
    const chunk = (stop > 800 ? from.slice(0, stop) : from).slice(0, 60_000);
    if (chunk.length > 400) return chunk;
  }

  return html.slice(0, 60_000);
}

function isStopHeading(text: string): boolean {
  const normalized = text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  return STOP_HEADINGS.some((stop) => normalized.includes(stop));
}

function buildContentHtml(chunk: string, sourceName: string, sourceUrl: string): {
  content: string;
  warnings: string[];
} {
  const warnings: string[] = [];
  const blocks: string[] = [];

  const tokens = [
    ...chunk.matchAll(/<(h2|h3|p)\b[^>]*>([\s\S]*?)<\/\1>/gi),
  ];

  for (const token of tokens) {
    const tag = token[1].toLowerCase();
    const text = cleanText(token[2]);
    if (!text || text.length < 2) continue;
    if (tag !== 'p' && isStopHeading(text)) break;
    if (/^(por |fuente:|compartir|seguinos)/i.test(text) && text.length < 80) continue;

    if (tag === 'h2') {
      blocks.push(`<h2>${escapeHtml(text)}</h2>`);
    } else if (tag === 'h3') {
      blocks.push(`<h3>${escapeHtml(text)}</h3>`);
    } else {
      blocks.push(`<p>${escapeHtml(text)}</p>`);
    }
  }

  if (blocks.length < 2) {
    warnings.push(
      'No se pudo detectar bien el cuerpo de la nota; revisá el contenido antes de publicar.'
    );
  }

  blocks.push(
    `<p><em>Fuente: <a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(sourceName)}</a></em></p>`
  );

  return { content: blocks.join('\n'), warnings };
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`El sitio respondió ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_HTML_BYTES) {
      throw new Error('La página es demasiado grande para importar');
    }

    return buffer.toString('utf8');
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado al leer la nota');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function downloadImage(
  imageUrl: string,
  title: string
): Promise<ImportedArticleImage | null> {
  const candidates = [unwrapCdnImageUrl(imageUrl), imageUrl].filter(
    (value, index, arr) => arr.indexOf(value) === index
  );

  for (const candidate of candidates) {
    try {
      assertPublicHttpUrl(candidate);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const response = await fetch(candidate, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'image/*,*/*;q=0.8',
        },
      }).finally(() => clearTimeout(timer));

      if (!response.ok) continue;

      const contentType = (response.headers.get('content-type') || 'image/jpeg')
        .split(';')[0]
        .trim()
        .toLowerCase();
      if (!contentType.startsWith('image/')) continue;

      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.byteLength || buffer.byteLength > MAX_IMAGE_BYTES) continue;

      const ext =
        contentType.includes('png')
          ? 'png'
          : contentType.includes('webp')
            ? 'webp'
            : contentType.includes('gif')
              ? 'gif'
              : 'jpg';

      const safeName = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48);

      return {
        base64: buffer.toString('base64'),
        contentType,
        filename: `${safeName || 'nota'}.${ext}`,
        sourceUrl: candidate,
      };
    } catch {
      // try next candidate
    }
  }

  return null;
}

export async function importArticleFromUrl(rawUrl: string): Promise<ImportedArticle> {
  const parsed = assertPublicHttpUrl(rawUrl);
  const url = parsed.toString();
  const html = await fetchHtml(url);

  const title = getTitle(html);
  if (!title) throw new Error('No se pudo detectar el título de la nota');

  const excerpt =
    getMeta(html, 'og:description') ||
    getMeta(html, 'twitter:description') ||
    getMeta(html, 'description') ||
    '';

  const sourceName =
    getMeta(html, 'og:site_name') ||
    getMeta(html, 'application-name') ||
    hostnameLabel(url);

  const imageRaw =
    getMeta(html, 'og:image') ||
    getMeta(html, 'og:image:url') ||
    getMeta(html, 'twitter:image') ||
    getMeta(html, 'twitter:image:src');

  const chunk = extractArticleChunk(html);
  const { content, warnings } = buildContentHtml(chunk, sourceName, url);

  let image: ImportedArticleImage | null = null;
  if (imageRaw) {
    image = await downloadImage(absoluteUrl(url, imageRaw), title);
    if (!image) {
      warnings.push('No se pudo copiar la imagen destacada; podés subirla a mano.');
    }
  } else {
    warnings.push('La nota no tiene imagen Open Graph detectada.');
  }

  return {
    url,
    title,
    excerpt,
    content,
    sourceName,
    image,
    warnings,
  };
}
