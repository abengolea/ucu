import { NextRequest, NextResponse } from 'next/server';
import { getInformeByCodigo, toVerificacionPublica } from '@/lib/informes-store';
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
    const pedido = await getInformeByCodigo(codigo);
    if (!pedido) {
      return NextResponse.json(
        {
          valido: false,
          codigo: codigo.trim().toUpperCase(),
          error: 'No encontramos un informe con ese código.',
        },
        { status: 404, headers: rateLimitHeaders(limit) }
      );
    }

    if (pedido.estado !== 'ready') {
      return NextResponse.json(
        {
          valido: false,
          codigo: pedido.codigo,
          error: 'El informe aún no fue emitido o el pago no está confirmado.',
          estado: pedido.estado,
        },
        { status: 404, headers: rateLimitHeaders(limit) }
      );
    }

    return NextResponse.json(toVerificacionPublica(pedido), {
      headers: rateLimitHeaders(limit),
    });
  } catch (error) {
    console.error('[informes/verificar]', error);
    return NextResponse.json({ error: 'Verificación no disponible' }, { status: 503 });
  }
}
