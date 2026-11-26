import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES: Record<string, string> = {
  '.csv': 'text/csv; charset=utf-8',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function safeRel(parts: string[]): string | null {
  if (!parts.length) return null;
  if (parts.some((part) => !part || part === '.' || part === '..' || part.includes('\\') || part.includes('\0'))) {
    return null;
  }
  return parts.join('/');
}

async function readInvFile(rel: string): Promise<Buffer | null> {
  const candidates = [
    path.join(process.cwd(), 'public', 'inv', rel),
    path.join(process.cwd(), 'inv', rel),
  ];
  for (const file of candidates) {
    try {
      return await readFile(file);
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: parts } = await context.params;
  const rel = safeRel(parts);
  if (!rel) {
    return new NextResponse('No encontrado', { status: 404 });
  }

  const buffer = await readInvFile(rel);
  if (!buffer) {
    return new NextResponse('No encontrado', { status: 404 });
  }

  const ext = path.extname(rel).toLowerCase();
  const filename = parts[parts.length - 1];
  const inline = ext === '.pdf' || ext === '.png' || ext === '.json' || ext === '.html';

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Content-Disposition': inline ? 'inline' : `attachment; filename="${filename}"`,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
