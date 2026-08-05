import { NextRequest, NextResponse } from 'next/server';
import { downloadInformePdfBuffer } from '@/lib/informe-fulfill';
import { getInformeByCodigo } from '@/lib/informes-store';
import {
  enforceRateLimit,
  getClientIp,
  rateLimitHeaders,
} from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ codigo: string }> }
) {
  const { codigo } = await context.params;
  const ip = getClientIp(request);
  const limit = await enforceRateLimit({
    namespace: 'informe_download_hour',
    key: ip,
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });

  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Demasiadas descargas.', retryAfterSec: limit.retryAfterSec },
      { status: 429, headers: rateLimitHeaders(limit) }
    );
  }

  try {
    const pedido = await getInformeByCodigo(codigo);
    if (!pedido || pedido.estado !== 'ready' || !pedido.pdfPath) {
      return NextResponse.json(
        { error: 'Informe no disponible. Si acabás de pagar, esperá unos segundos.' },
        { status: 404 }
      );
    }

    const buffer = await downloadInformePdfBuffer(pedido);
    if (!buffer) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

    const filename = `informe-ucu-${pedido.codigo}.pdf`;
    const inline = request.nextUrl.searchParams.get('inline') === '1';
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        ...rateLimitHeaders(limit),
      },
    });
  } catch (error) {
    console.error('[informes/download]', error);
    return NextResponse.json({ error: 'No se pudo descargar el informe' }, { status: 503 });
  }
}
