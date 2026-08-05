import { NextRequest, NextResponse } from 'next/server';
import {
  formatPrecioArs,
  getInformePrecioCents,
  getPublicEmpresaStats,
  INFORME_MIN_CASOS,
} from '@/lib/empresa-stats-public';
import {
  applyStatsSessionCookie,
  enforceRateLimit,
  getClientIp,
  getOrCreateStatsSessionId,
  rateLimitHeaders,
} from '@/lib/rate-limit';
import { isMercadoPagoConfigured } from '@/lib/mercadopago';

export const runtime = 'nodejs';

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await context.params;
  const empresaId = Number(rawId);
  if (!Number.isFinite(empresaId) || empresaId <= 0) {
    return NextResponse.json({ error: 'Empresa inválida' }, { status: 400 });
  }

  const ip = getClientIp(request);
  const { sessionId, setCookie } = getOrCreateStatsSessionId(request);
  const rateKey = `${ip}:${sessionId}`;

  const [hourly, burst] = await Promise.all([
    enforceRateLimit({
      namespace: 'stats_empresa_hour',
      key: rateKey,
      limit: 20,
      windowMs: HOUR_MS,
    }),
    enforceRateLimit({
      namespace: 'stats_empresa_burst',
      key: rateKey,
      limit: 5,
      windowMs: MINUTE_MS,
    }),
  ]);

  const blocked = !hourly.ok ? hourly : !burst.ok ? burst : null;
  if (blocked) {
    const res = NextResponse.json(
      {
        error: 'Demasiadas consultas. Probá más tarde o pedí el informe certificado.',
        retryAfterSec: blocked.retryAfterSec,
      },
      { status: 429, headers: rateLimitHeaders(blocked) }
    );
    if (setCookie) applyStatsSessionCookie(res, sessionId);
    return res;
  }

  try {
    const data = await getPublicEmpresaStats(empresaId);
    if (!data) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    const precioCents = getInformePrecioCents();
    const puedeInforme = data.stats.total >= INFORME_MIN_CASOS;

    const res = NextResponse.json(
      {
        empresaId: data.empresaId,
        empresaNombre: data.empresaNombre,
        total: data.stats.total,
        rangoFechas: data.stats.rangoFechas,
        cachedAt: data.cachedAt,
        mensaje:
          data.stats.total === 0
            ? `No encontramos reclamos registrados contra ${data.empresaNombre}.`
            : `Encontramos ${data.stats.total} reclamo${data.stats.total === 1 ? '' : 's'} contra ${data.empresaNombre}.`,
        informe: {
          disponible: puedeInforme && isMercadoPagoConfigured(),
          precioCents,
          precioLabel: formatPrecioArs(precioCents),
          pagosConfigurados: isMercadoPagoConfigured(),
          requiereMinimo: INFORME_MIN_CASOS,
          incluye: 'total de reclamos, causas tipificadas y lectura para el consumidor',
        },
      },
      { headers: rateLimitHeaders(hourly) }
    );
    if (setCookie) applyStatsSessionCookie(res, sessionId);
    return res;
  } catch (error) {
    console.error('[estadisticas/empresa]', error);
    return NextResponse.json({ error: 'Estadísticas no disponibles' }, { status: 503 });
  }
}
