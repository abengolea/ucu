import { NextRequest, NextResponse } from 'next/server';
import { fulfillInformeFromPaymentId } from '@/lib/informe-fulfill';
import { verifyMercadoPagoWebhookSignature } from '@/lib/mercadopago';

export const runtime = 'nodejs';

/**
 * Mercado Pago IPN / Webhooks.
 * Docs: topic=payment&id=... or JSON body with data.id
 */
export async function POST(request: NextRequest) {
  try {
    const topic =
      request.nextUrl.searchParams.get('topic') ||
      request.nextUrl.searchParams.get('type') ||
      '';
    const queryId =
      request.nextUrl.searchParams.get('id') ||
      request.nextUrl.searchParams.get('data.id') ||
      '';

    let paymentId = queryId;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const body = (await request.json()) as {
          type?: string;
          action?: string;
          data?: { id?: string | number };
        };
        if (body?.data?.id != null) {
          paymentId = String(body.data.id);
        }
      } catch {
        // body optional for query-string IPNs
      }
    }

    const dataIdForSignature =
      request.nextUrl.searchParams.get('data.id') || paymentId || null;
    const valid = verifyMercadoPagoWebhookSignature({
      xSignature: request.headers.get('x-signature'),
      xRequestId: request.headers.get('x-request-id'),
      dataId: dataIdForSignature,
    });
    if (!valid) {
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
    }

    const effectiveTopic = topic || 'payment';
    if (effectiveTopic !== 'payment' && effectiveTopic !== 'merchant_order') {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (!paymentId || effectiveTopic === 'merchant_order') {
      // merchant_order notifications don't carry payment id in the same way;
      // payment notifications are the source of truth for fulfillment.
      if (!paymentId) {
        return NextResponse.json({ ok: true, skipped: true });
      }
    }

    if (effectiveTopic === 'payment' && paymentId) {
      await fulfillInformeFromPaymentId(paymentId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[webhooks/mercadopago]', error);
    // Still 200 so MP doesn't hammer forever on permanent errors;
    // log and investigate. Transient errors can return 500 to retry.
    const message = error instanceof Error ? error.message : 'error';
    if (message.includes('no encontrado') || message.includes('no configurado')) {
      return NextResponse.json({ ok: false, error: message }, { status: 200 });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // MP sometimes probes with GET
  return POST(request);
}
