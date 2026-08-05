import { NextRequest, NextResponse } from 'next/server';
import { buildInformeStatsSnapshot } from '@/lib/informe-data';
import {
  createInformePedido,
  updateInformePedido,
} from '@/lib/informes-store';
import {
  createInformePreference,
  isMercadoPagoConfigured,
} from '@/lib/mercadopago';
import {
  enforceRateLimit,
  getClientIp,
  getOrCreateStatsSessionId,
  rateLimitHeaders,
} from '@/lib/rate-limit';
import {
  formatPrecioArs,
  getInformePrecioCents,
  getPublicEmpresaStats,
  INFORME_MIN_CASOS,
} from '@/lib/empresa-stats-public';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  if (!isMercadoPagoConfigured()) {
    return NextResponse.json(
      { error: 'Pagos no configurados. Contactá a UCU para habilitar informes.' },
      { status: 503 }
    );
  }

  const ip = getClientIp(request);
  const { sessionId } = getOrCreateStatsSessionId(request);
  const checkoutLimit = await enforceRateLimit({
    namespace: 'informe_checkout_hour',
    key: `${ip}:${sessionId}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });

  if (!checkoutLimit.ok) {
    return NextResponse.json(
      { error: 'Demasiados intentos de pago. Probá más tarde.', retryAfterSec: checkoutLimit.retryAfterSec },
      { status: 429, headers: rateLimitHeaders(checkoutLimit) }
    );
  }

  let body: { empresaId?: number; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const empresaId = Number(body.empresaId);
  const email = (body.email ?? '').trim().toLowerCase();

  if (!Number.isFinite(empresaId) || empresaId <= 0) {
    return NextResponse.json({ error: 'empresaId inválido' }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }

  try {
    const [teaser, snapshot] = await Promise.all([
      getPublicEmpresaStats(empresaId),
      buildInformeStatsSnapshot(empresaId),
    ]);
    if (!teaser || !snapshot) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }
    if (snapshot.total < INFORME_MIN_CASOS) {
      return NextResponse.json(
        { error: 'No hay reclamos suficientes para emitir un informe.' },
        { status: 400 }
      );
    }

    const precioCents = getInformePrecioCents();
    const pedido = await createInformePedido({
      empresaId: teaser.empresaId,
      empresaNombre: teaser.empresaNombre,
      email,
      precioCents,
      statsSnapshot: snapshot,
    });

    const preference = await createInformePreference({
      pedidoId: pedido.id,
      codigo: pedido.codigo,
      empresaNombre: pedido.empresaNombre,
      email: pedido.email,
      precioCents,
    });

    await updateInformePedido(pedido.id, {
      mpPreferenceId: preference.preferenceId,
    });

    return NextResponse.json({
      pedidoId: pedido.id,
      codigo: pedido.codigo,
      precioLabel: formatPrecioArs(precioCents),
      initPoint: preference.initPoint,
    });
  } catch (error) {
    console.error('[informes/checkout]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo iniciar el pago' },
      { status: 500 }
    );
  }
}
