import { NextRequest, NextResponse } from 'next/server';
import {
  applyStatsSessionCookie,
  enforceRateLimit,
  getClientIp,
  getOrCreateStatsSessionId,
  rateLimitHeaders,
} from '@/lib/rate-limit';
import { searchReclamoEmpresasFromFirestore } from '@/lib/reclamos-store';

export const runtime = 'nodejs';

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const ip = getClientIp(request);
  const { sessionId, setCookie } = getOrCreateStatsSessionId(request);
  const rateKey = `${ip}:${sessionId}`;

  const [hourly, burst] = await Promise.all([
    enforceRateLimit({
      namespace: 'stats_buscar_hour',
      key: rateKey,
      limit: 60,
      windowMs: HOUR_MS,
    }),
    enforceRateLimit({
      namespace: 'stats_buscar_burst',
      key: rateKey,
      limit: 12,
      windowMs: MINUTE_MS,
    }),
  ]);

  const blocked = !hourly.ok ? hourly : !burst.ok ? burst : null;
  if (blocked) {
    const res = NextResponse.json(
      {
        error: 'Demasiadas búsquedas. Probá de nuevo en unos minutos.',
        retryAfterSec: blocked.retryAfterSec,
      },
      { status: 429, headers: rateLimitHeaders(blocked) }
    );
    if (setCookie) applyStatsSessionCookie(res, sessionId);
    return res;
  }

  try {
    const empresas = await searchReclamoEmpresasFromFirestore(q, 12);
    const res = NextResponse.json(
      empresas.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        cuit: e.cuit ?? null,
      })),
      { headers: rateLimitHeaders(hourly) }
    );
    if (setCookie) applyStatsSessionCookie(res, sessionId);
    return res;
  } catch (error) {
    console.error('[estadisticas/buscar]', error);
    return NextResponse.json({ error: 'Búsqueda no disponible' }, { status: 503 });
  }
}
