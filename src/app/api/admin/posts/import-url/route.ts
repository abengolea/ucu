import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/admin-session';
import { importArticleFromUrl } from '@/lib/article-import';

export async function POST(request: NextRequest) {
  if (!requireAdminPermission(request, 'posts:write')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const url = String(body.url || '').trim();
  if (!url) {
    return NextResponse.json({ error: 'Pegá la URL de la nota' }, { status: 400 });
  }

  try {
    const article = await importArticleFromUrl(url);
    return NextResponse.json({ ok: true, article });
  } catch (error) {
    console.error('[posts/import-url]', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'No se pudo importar la nota',
      },
      { status: 400 }
    );
  }
}
