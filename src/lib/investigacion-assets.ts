import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getAdminStorage } from '@/lib/firebase-admin';

export const INVESTIGACION_ASSET_TYPES: Record<string, string> = {
  '.csv': 'text/csv; charset=utf-8',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain; charset=utf-8',
};

export function investigacionAssetContentType(filename: string): string {
  return (
    INVESTIGACION_ASSET_TYPES[path.extname(filename).toLowerCase()] ||
    'application/octet-stream'
  );
}

export function safeInvestigacionAssetRel(parts: string[]): string | null {
  if (!parts.length) return null;
  if (
    parts.some(
      (part) => !part || part === '.' || part === '..' || part.includes('\\') || part.includes('\0')
    )
  ) {
    return null;
  }
  return parts.join('/');
}

export function investigacionAssetStoragePath(rel: string): string {
  return `investigaciones/${rel.replace(/^\/+/, '')}`;
}

export async function readInvestigacionAsset(rel: string): Promise<Buffer | null> {
  const diskCandidates = [
    path.join(process.cwd(), 'public', 'inv', rel),
    path.join(process.cwd(), 'inv', rel),
  ];
  for (const file of diskCandidates) {
    try {
      return await readFile(file);
    } catch {
      /* try storage */
    }
  }

  const storage = getAdminStorage();
  if (!storage) return null;

  try {
    const [buffer] = await storage.bucket().file(investigacionAssetStoragePath(rel)).download();
    return buffer;
  } catch {
    return null;
  }
}
