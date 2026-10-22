import 'server-only';

import { spawn } from 'node:child_process';
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
  'contacto con la redaccion',
  'comentarios',
];

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
};

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

function stripNoiseHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<blockquote\b[^>]*class="[^"]*twitter-tweet[^"]*"[\s\S]*?<\/blockquote>/gi, ' ')
    .replace(/<figure\b[^>]*class="[^"]*(?:wp-block-embed|twitter)[^"]*"[\s\S]*?<\/figure>/gi, ' ');
}

function looksLikeChallengePage(html: string): boolean {
  return /just a moment|cf-mitigated|attention required|performing security verification|cdn-cgi\/challenge/i.test(
    html
  );
}

function wordpressSlugFromUrl(pageUrl: URL): string | null {
  const parts = pageUrl.pathname.split('/').filter(Boolean);
  if (!parts.length) return null;
  let slug = parts[parts.length - 1] || '';
  if (/^(amp|embed|feed)$/i.test(slug)) {
    slug = parts[parts.length - 2] || '';
  }
  if (!slug || !/^[a-z0-9][a-z0-9-]{2,}$/i.test(slug)) return null;
  return slug;
}

type WpRendered = { rendered?: string };
type WpPost = {
  title?: WpRendered;
  excerpt?: WpRendered;
  content?: WpRendered;
  link?: string;
  featured_media?: number;
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url?: string }>;
  };
};

function wpText(value?: WpRendered): string {
  return cleanText(value?.rendered || '');
}

function extractArticleChunk(html: string): string {
  const openPatterns = [
    /<(?:div|section|article)\b[^>]*class="(?:[^"]*\s)?article-content(?:\s[^"]*)?"[^>]*>/i,
    /<(?:div|section|article)\b[^>]*class="(?:[^"]*\s)?main-article(?:\s[^"]*)?"[^>]*>/i,
    /<(?:div|section|article)\b[^>]*class="(?:[^"]*\s)?(?:entry-content|post-content|nota-body|nota-cuerpo|article-body|article__body)(?:\s[^"]*)?"[^>]*>/i,
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

function looksLikeParagraph(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length > 160) return true;
  return trimmed.length > 90 && /[.!?…]$/.test(trimmed);
}

function extractTextBlocks(chunk: string): Array<{ tag: string; html: string }> {
  const opens: Array<{ tag: string; start: number; contentStart: number }> = [];
  const openRe = /<(h2|h3|p)\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = openRe.exec(chunk)) !== null) {
    opens.push({
      tag: match[1].toLowerCase(),
      start: match.index,
      contentStart: match.index + match[0].length,
    });
  }

  return opens.map((current, index) => {
    const nextStart = index + 1 < opens.length ? opens[index + 1].start : chunk.length;
    const region = chunk.slice(current.contentStart, nextStart);
    const close = region.search(new RegExp(`</${current.tag}>`, 'i'));
    return {
      tag: current.tag,
      html: close >= 0 ? region.slice(0, close) : region,
    };
  });
}

function buildContentHtml(
  chunk: string,
  sourceName: string,
  sourceUrl: string,
  lead = ''
): {
  content: string;
  warnings: string[];
} {
  const warnings: string[] = [];
  const blocks: string[] = [];
  const seen = new Set<string>();
  const leadText = cleanText(lead);
  if (leadText.length > 40) seen.add(leadText);

  for (const token of extractTextBlocks(chunk)) {
    const tag = token.tag;
    const text = cleanText(token.html);
    if (!text || text.length < 2) continue;
    if (tag !== 'p' && isStopHeading(text)) break;
    if (/^(por |fuente:|compartir|seguinos)/i.test(text) && text.length < 80) continue;
    if (text.length > 80 && seen.has(text)) continue;
    seen.add(text);

    const asParagraph = tag === 'p' || looksLikeParagraph(text);
    if (!asParagraph && tag === 'h2') {
      blocks.push(`<h2>${escapeHtml(text)}</h2>`);
    } else if (!asParagraph && tag === 'h3') {
      blocks.push(`<h3>${escapeHtml(text)}</h3>`);
    } else {
      blocks.push(`<p>${escapeHtml(text)}</p>`);
    }
  }

  if (leadText.length > 40) {
    blocks.unshift(`<p>${escapeHtml(leadText)}</p>`);
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

type FetchedUrl = {
  ok: boolean;
  status: number;
  buffer: Buffer;
  contentType: string;
};

const CURL_META = '\n__UCU_META__';

function isUsableResponse(result: FetchedUrl): boolean {
  if (!result.ok) return false;
  if (!/html|json|text|xml/i.test(result.contentType) && result.contentType) {
    return true;
  }
  const head = result.buffer.subarray(0, 2500).toString('utf8');
  return !looksLikeChallengePage(head);
}

async function fetchWithNode(url: string, accept: string): Promise<FetchedUrl> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        ...BROWSER_HEADERS,
        Accept: accept,
      },
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      ok: response.ok,
      status: response.status,
      buffer,
      contentType: (response.headers.get('content-type') || '').split(';')[0].trim(),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado al leer la nota');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithCurl(url: string, accept: string): Promise<FetchedUrl | null> {
  return new Promise((resolve) => {
    const child = spawn(
      process.platform === 'win32' ? 'curl.exe' : 'curl',
      [
        '-sS',
        '-L',
        '--max-time',
        String(Math.ceil(FETCH_TIMEOUT_MS / 1000)),
        '--compressed',
        '-A',
        BROWSER_HEADERS['User-Agent'],
        '-H',
        `Accept: ${accept}`,
        '-H',
        `Accept-Language: ${BROWSER_HEADERS['Accept-Language']}`,
        '-w',
        `${CURL_META}%{http_code}|%{content_type}`,
        url,
      ],
      { windowsHide: true }
    );

    const chunks: Buffer[] = [];
    child.stdout.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    child.on('error', () => resolve(null));
    child.on('close', (code) => {
      if (code !== 0) {
        resolve(null);
        return;
      }
      const raw = Buffer.concat(chunks);
      const marker = Buffer.from(CURL_META);
      const idx = raw.lastIndexOf(marker);
      if (idx < 0) {
        resolve(null);
        return;
      }
      const meta = raw.subarray(idx + marker.length).toString('utf8').trim();
      const [statusRaw, contentType = ''] = meta.split('|');
      const status = Number(statusRaw);
      resolve({
        ok: status >= 200 && status < 300,
        status: Number.isFinite(status) ? status : 0,
        buffer: raw.subarray(0, idx),
        contentType: contentType.split(';')[0].trim(),
      });
    });
  });
}

async function fetchUrl(url: string, accept: string): Promise<FetchedUrl> {
  let nodeResult: FetchedUrl | null = null;
  let nodeError: unknown = null;

  try {
    nodeResult = await fetchWithNode(url, accept);
    if (isUsableResponse(nodeResult)) return nodeResult;
  } catch (error) {
    nodeError = error;
  }

  const curlResult = await fetchWithCurl(url, accept);
  if (curlResult && isUsableResponse(curlResult)) return curlResult;
  if (curlResult) return curlResult;
  if (nodeResult) return nodeResult;
  if (nodeError instanceof Error && nodeError.message) throw nodeError;
  throw new Error('No se pudo leer la nota');
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetchUrl(url, 'text/html,application/xhtml+xml');
  if (!response.ok) {
    throw new Error(`El sitio respondió ${response.status}`);
  }
  if (response.buffer.byteLength > MAX_HTML_BYTES) {
    throw new Error('La página es demasiado grande para importar');
  }
  const html = response.buffer.toString('utf8');
  if (looksLikeChallengePage(html)) {
    throw new Error('El sitio respondió 403');
  }
  return html;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetchUrl(url, 'application/json,text/plain,*/*');
  if (!response.ok) {
    throw new Error(`El sitio respondió ${response.status}`);
  }
  return JSON.parse(response.buffer.toString('utf8'));
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
      const response = await fetchUrl(candidate, 'image/*,*/*;q=0.8');
      if (!response.ok) continue;

      const contentType = (response.contentType || 'image/jpeg').toLowerCase();
      if (!contentType.startsWith('image/')) continue;

      const buffer = response.buffer;
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

async function assembleArticle(input: {
  url: string;
  html: string;
  title?: string;
  excerpt?: string;
  sourceName?: string;
  imageUrl?: string | null;
}): Promise<ImportedArticle> {
  const html = stripNoiseHtml(input.html);
  const title = input.title || getTitle(html);
  if (!title) throw new Error('No se pudo detectar el título de la nota');

  const excerpt =
    input.excerpt ||
    getMeta(html, 'og:description') ||
    getMeta(html, 'twitter:description') ||
    getMeta(html, 'description') ||
    '';

  const sourceName =
    input.sourceName ||
    getMeta(html, 'og:site_name') ||
    getMeta(html, 'application-name') ||
    hostnameLabel(input.url);

  const imageRaw =
    input.imageUrl ||
    getMeta(html, 'og:image') ||
    getMeta(html, 'og:image:url') ||
    getMeta(html, 'twitter:image') ||
    getMeta(html, 'twitter:image:src');

  const chunk = extractArticleChunk(html);
  const { content, warnings } = buildContentHtml(chunk, sourceName, input.url, excerpt);

  let image: ImportedArticleImage | null = null;
  if (imageRaw) {
    image = await downloadImage(absoluteUrl(input.url, imageRaw), title);
    if (!image) {
      warnings.push('No se pudo copiar la imagen destacada; podés subirla a mano.');
    }
  } else {
    warnings.push('La nota no tiene imagen Open Graph detectada.');
  }

  return {
    url: input.url,
    title,
    excerpt,
    content,
    sourceName,
    image,
    warnings,
  };
}

async function wordpressFeaturedImage(
  origin: string,
  post: WpPost
): Promise<string | null> {
  const embedded = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;
  if (embedded) return embedded;

  const mediaId = Number(post.featured_media || 0);
  if (!mediaId) return null;

  const endpoints = [
    `${origin}/?rest_route=/wp/v2/media/${mediaId}`,
    `${origin}/wp-json/wp/v2/media/${mediaId}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const payload = (await fetchJson(endpoint)) as { source_url?: string };
      if (payload?.source_url) return payload.source_url;
    } catch {
      // try next REST shape
    }
  }

  return null;
}

async function importFromWordpressApi(pageUrl: URL): Promise<ImportedArticle | null> {
  const slug = wordpressSlugFromUrl(pageUrl);
  if (!slug) return null;

  const origin = pageUrl.origin;
  const encoded = encodeURIComponent(slug);
  const endpoints = [
    `${origin}/?rest_route=/wp/v2/posts&slug=${encoded}&_embed=1`,
    `${origin}/wp-json/wp/v2/posts?slug=${encoded}&_embed=1`,
  ];

  for (const endpoint of endpoints) {
    try {
      const payload = await fetchJson(endpoint);
      const post = Array.isArray(payload) ? (payload[0] as WpPost | undefined) : undefined;
      const contentHtml = post?.content?.rendered?.trim();
      if (!post || !contentHtml) continue;

      return await assembleArticle({
        url: post.link || pageUrl.toString(),
        html: `<article>${contentHtml}</article>`,
        title: wpText(post.title),
        excerpt: wpText(post.excerpt),
        sourceName: hostnameLabel(pageUrl.toString()),
        imageUrl: await wordpressFeaturedImage(origin, post),
      });
    } catch {
      // Cloudflare often blocks /wp-json but allows ?rest_route=
    }
  }

  return null;
}

export async function importArticleFromUrl(rawUrl: string): Promise<ImportedArticle> {
  const parsed = assertPublicHttpUrl(rawUrl);
  const url = parsed.toString();

  try {
    const html = await fetchHtml(url);
    return await assembleArticle({ url, html });
  } catch (error) {
    const wordpress = await importFromWordpressApi(parsed);
    if (wordpress) return wordpress;

    if (error instanceof Error && /respondió 403/.test(error.message)) {
      throw new Error(
        'El diario bloqueó la lectura automática (403). Probá de nuevo o copiá el texto a mano.'
      );
    }
    throw error;
  }
}
