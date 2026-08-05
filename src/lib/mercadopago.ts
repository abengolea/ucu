import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { getSiteUrl } from '@/lib/seo';

function getAccessToken(): string | null {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) return null;
  return token;
}

function getWebhookSecret(): string | null {
  return process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() || null;
}

export function isMercadoPagoConfigured(): boolean {
  return Boolean(getAccessToken());
}

/**
 * Valida x-signature de webhooks (HMAC-SHA256).
 * Manifest: id:[data.id];request-id:[x-request-id];ts:[ts];
 * @see https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 */
export function verifyMercadoPagoWebhookSignature(input: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): boolean {
  const secret = getWebhookSecret();
  // Sin secreto configurado no bloqueamos (útil en bootstrap); en prod conviene setearlo.
  if (!secret) return true;
  if (!input.xSignature) return false;

  const parts = Object.fromEntries(
    input.xSignature.split(',').map((part) => {
      const [k, ...rest] = part.trim().split('=');
      return [k, rest.join('=')];
    })
  ) as Record<string, string>;

  const ts = parts.ts;
  const hash = parts.v1;
  if (!ts || !hash) return false;

  let manifest = '';
  if (input.dataId) {
    manifest += `id:${input.dataId.toLowerCase()};`;
  }
  if (input.xRequestId) {
    manifest += `request-id:${input.xRequestId};`;
  }
  manifest += `ts:${ts};`;

  const expected = createHmac('sha256', secret).update(manifest).digest('hex');
  try {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(hash, 'utf8');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function getClient(): MercadoPagoConfig {
  const accessToken = getAccessToken();
  if (!accessToken) throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado');
  return new MercadoPagoConfig({ accessToken });
}

export async function createInformePreference(input: {
  pedidoId: string;
  codigo: string;
  empresaNombre: string;
  email: string;
  precioCents: number;
}): Promise<{ preferenceId: string; initPoint: string }> {
  const client = getClient();
  const preference = new Preference(client);
  const siteUrl = getSiteUrl();
  const unitPrice = Number((input.precioCents / 100).toFixed(2));
  // Mercado Pago rechaza auto_return si las back_urls no son públicas (ej. localhost en dev).
  const isPublicUrl = siteUrl.startsWith('https://') && !siteUrl.includes('localhost');

  const result = await preference.create({
    body: {
      items: [
        {
          id: input.pedidoId,
          title: `Informe de reclamos UCU — ${input.empresaNombre}`,
          description: `Informe certificable ${input.codigo}`,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: unitPrice,
        },
      ],
      payer: {
        email: input.email,
      },
      external_reference: input.pedidoId,
      metadata: {
        pedido_id: input.pedidoId,
        codigo: input.codigo,
      },
      back_urls: {
        success: `${siteUrl}/reclamos/estadisticas/pago?status=success&pedido=${input.pedidoId}`,
        failure: `${siteUrl}/reclamos/estadisticas/pago?status=failure&pedido=${input.pedidoId}`,
        pending: `${siteUrl}/reclamos/estadisticas/pago?status=pending&pedido=${input.pedidoId}`,
      },
      ...(isPublicUrl ? { auto_return: 'approved' as const } : {}),
      ...(isPublicUrl ? { notification_url: `${siteUrl}/api/webhooks/mercadopago` } : {}),
      statement_descriptor: 'UCU INFORME',
    },
  });

  const preferenceId = result.id;
  const initPoint = result.init_point || result.sandbox_init_point;
  if (!preferenceId || !initPoint) {
    throw new Error('Mercado Pago no devolvió preference id / init_point');
  }

  return { preferenceId, initPoint };
}

export async function fetchMercadoPagoPayment(paymentId: string): Promise<{
  id: string;
  status: string | null;
  statusDetail: string | null;
  externalReference: string | null;
  preferenceId: string | null;
}> {
  const client = getClient();
  const payment = new Payment(client);
  const result = await payment.get({ id: paymentId });

  return {
    id: String(result.id ?? paymentId),
    status: result.status ?? null,
    statusDetail: result.status_detail ?? null,
    externalReference:
      typeof result.external_reference === 'string' ? result.external_reference : null,
    preferenceId:
      typeof (result as { preference_id?: string }).preference_id === 'string'
        ? (result as { preference_id?: string }).preference_id ?? null
        : null,
  };
}
