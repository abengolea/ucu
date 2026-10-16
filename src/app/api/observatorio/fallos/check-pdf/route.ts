import { NextRequest, NextResponse } from 'next/server';
import { requireMemberApi } from '@/lib/member-session';
import { findDuplicateFalloForPdfBuffer } from '@/lib/fallo-pdf-duplicate';
import { validateFalloPdfFile } from '@/lib/fallo-request-body';

const MAX_PDF_BYTES = 12 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const access = await requireMemberApi(request);
  if (access instanceof NextResponse) return access;

  const formData = await request.formData();
  const file = formData.get('pdf');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Subí un archivo PDF' }, { status: 400 });
  }

  const pdfError = validateFalloPdfFile(file);
  if (pdfError) {
    return NextResponse.json({ error: pdfError }, { status: 400 });
  }

  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json(
      { error: `El PDF supera el límite de ${MAX_PDF_BYTES / (1024 * 1024)} MB` },
      { status: 400 }
    );
  }

  const excludeRaw = request.nextUrl.searchParams.get('exclude');
  const excludeExpediente =
    excludeRaw != null && excludeRaw !== '' ? Number(excludeRaw) : undefined;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { match } = await findDuplicateFalloForPdfBuffer(
      buffer,
      Number.isFinite(excludeExpediente) ? excludeExpediente : undefined
    );

    if (match) {
      return NextResponse.json({ duplicate: true, fallo: match });
    }

    return NextResponse.json({ duplicate: false });
  } catch (error) {
    console.error('[fallos/check-pdf]', error);
    return NextResponse.json({ error: 'No se pudo verificar el PDF' }, { status: 500 });
  }
}
