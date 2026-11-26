import path from 'node:path';
import { NextResponse } from 'next/server';
import {
  investigacionAssetContentType,
  readInvestigacionAsset,
  safeInvestigacionAssetRel,
} from '@/lib/investigacion-assets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: parts } = await context.params;
  const rel = safeInvestigacionAssetRel(parts);
  if (!rel) {
    return new NextResponse('No encontrado', { status: 404 });
  }

  const buffer = await readInvestigacionAsset(rel);
  if (!buffer) {
    return new NextResponse('No encontrado', { status: 404 });
  }

  const ext = path.extname(rel).toLowerCase();
  const filename = parts[parts.length - 1];
  const inline =
    ext === '.pdf' ||
    ext === '.png' ||
    ext === '.jpg' ||
    ext === '.jpeg' ||
    ext === '.svg' ||
    ext === '.webp' ||
    ext === '.json' ||
    ext === '.js' ||
    ext === '.mjs' ||
    ext === '.css' ||
    ext === '.woff2' ||
    ext === '.html' ||
    ext === '.htm';

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': investigacionAssetContentType(filename),
      'Content-Disposition': inline ? 'inline' : `attachment; filename="${filename}"`,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
