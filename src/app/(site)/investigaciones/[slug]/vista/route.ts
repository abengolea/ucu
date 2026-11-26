import { NextResponse } from 'next/server';
import {
  getInvestigacionBySlug,
  loadInvestigacionHtml,
  wrapInvestigacionHtml,
} from '@/lib/investigaciones';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const item = await getInvestigacionBySlug(slug).catch(() => null);
  if (!item) {
    return new NextResponse('Investigación no encontrada', { status: 404 });
  }

  let html = '';
  try {
    html = await loadInvestigacionHtml(item);
  } catch {
    return new NextResponse('No se pudo leer la investigación', { status: 500 });
  }

  const body = wrapInvestigacionHtml(html, item.title);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Frame-Options': 'SAMEORIGIN',
      'Cache-Control': 'private, no-store',
    },
  });
}
