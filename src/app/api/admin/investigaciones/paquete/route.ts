import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAdminPermission } from '@/lib/admin-session';
import {
  persistInvestigacionAssets,
  uniqueInvestigacionSlug,
} from '@/lib/admin-investigaciones-server';
import {
  rewriteInvestigacionBundle,
  suggestedSlugFromZipName,
  unpackInvestigacionZip,
} from '@/lib/investigacion-ingest';
import { slugify } from '@/lib/slug';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function POST(request: NextRequest) {
  if (!requireAdminPermission(request, 'posts:write')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: 'Firebase no configurado' }, { status: 500 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el zip' }, { status: 400 });
  }

  const file = form.get('zip');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Subí un archivo .zip' }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return NextResponse.json({ error: 'El paquete tiene que ser un .zip' }, { status: 400 });
  }

  const replaceSlug = slugify(String(form.get('slug') || '').trim());
  const requested = replaceSlug || suggestedSlugFromZipName(file.name);
  const slug = await uniqueInvestigacionSlug(db, requested, replaceSlug || undefined);

  try {
    const unpacked = await unpackInvestigacionZip(Buffer.from(await file.arrayBuffer()));
    const bundle = rewriteInvestigacionBundle(unpacked, slug);
    const files = await persistInvestigacionAssets(slug, bundle.assets);

    return NextResponse.json({
      ok: true,
      slug,
      html: bundle.html,
      title: unpacked.title,
      excerpt: unpacked.excerpt,
      files: files.map((item) => ({
        rel: item.rel,
        bytes: item.bytes,
        label: `${item.rel} · ${formatBytes(item.bytes)}`,
      })),
      fileCount: files.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo leer el zip';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
