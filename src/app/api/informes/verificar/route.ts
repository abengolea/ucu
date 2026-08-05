import { NextRequest, NextResponse } from 'next/server';
import { getInformeByPdfHash, toVerificacionPublica } from '@/lib/informes-store';
import {
  enforceRateLimit,
  getClientIp,
  rateLimitHeaders,
} from '@/lib/rate-limit';

export const runtime = 'nodejs';

const HASH_RE = /^[a-f0-9]{64}$/i;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = await enforceRateLimit({
    namespace: 'informe_verify_hour',
    key: ip,
    limit: 60,
    windowMs: 60 * 60 * 1000,
  });

  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Demasiadas verificaciones.', retryAfterSec: limit.retryAfterSec },
      { status: 429, headers: rateLimitHeaders(limit) }
    );
  }

  try {
    const body = (await request.json()) as { hash?: unknown };
    const hash = typeof body.hash === 'string' ? body.hash.trim().toLowerCase() : '';

    if (!HASH_RE.test(hash)) {
      return NextResponse.json(
        { valido: false, error: 'Huella SHA-256 inválida.' },
        { status: 400, headers: rateLimitHeaders(limit) }
      );
    }

    const pedido = await getInformeByPdfHash(hash);
    if (!pedido || pedido.estado !== 'ready') {
      return NextResponse.json(
        {
          valido: false,
          pdfHash: hash,
          error:
            'Este PDF no coincide con ningún informe emitido por UCU. Puede estar alterado, incompleto o no haber sido generado por nosotros.',
        },
        { status: 404, headers: rateLimitHeaders(limit) }
      );
    }

    return NextResponse.json(toVerificacionPublica(pedido), {
      headers: rateLimitHeaders(limit),
    });
  } catch (error) {
    console.error('[informes/verificar-hash]', error);
    return NextResponse.json({ error: 'Verificación no disponible' }, { status: 503 });
  }
}
