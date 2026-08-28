import { getSiteUrl } from '@/lib/seo';

export const INDEXNOW_KEY = '6c4e8a91b2f04d7ea1c9f3b8d0e5a276';

export function getIndexNowKeyLocation(): string {
  return `${getSiteUrl()}/${INDEXNOW_KEY}.txt`;
}

/** Avisa a Bing / IndexNow que una URL pública cambió. No bloquea la respuesta. */
export function notifyIndexNow(paths: string[]): void {
  const urls = paths
    .map((path) => {
      if (path.startsWith('http')) return path;
      const base = getSiteUrl();
      return `${base}${path.startsWith('/') ? path : `/${path}`}`;
    })
    .filter(Boolean);

  if (!urls.length) return;

  const host = new URL(getSiteUrl()).host;
  const body = JSON.stringify({
    host,
    key: INDEXNOW_KEY,
    keyLocation: getIndexNowKeyLocation(),
    urlList: urls,
  });

  void fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body,
  }).catch((error) => {
    console.warn('[indexnow] ping failed', error);
  });
}
