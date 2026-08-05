import { NextRequest, NextResponse } from 'next/server';
import { tryFulfillPedidoIfPaid } from '@/lib/informe-fulfill';
import { getInformeById, toVerificacionPublica } from '@/lib/informes-store';
import { getSiteUrl } from '@/lib/seo';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const paymentId = request.nextUrl.searchParams.get('payment_id');

  try {
    let pedido = await getInformeById(id);
    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    if (pedido.estado !== 'ready' && paymentId) {
      const fulfilled = await tryFulfillPedidoIfPaid(id, paymentId);
      if (fulfilled) pedido = fulfilled;
    } else if (
      pedido.estado === 'paid' ||
      (pedido.estado === 'pending_payment' && pedido.mpPaymentId)
    ) {
      const fulfilled = await tryFulfillPedidoIfPaid(id, pedido.mpPaymentId);
      if (fulfilled) pedido = fulfilled;
    }

    const siteUrl = getSiteUrl();
    return NextResponse.json({
      pedidoId: pedido.id,
      codigo: pedido.codigo,
      estado: pedido.estado,
      empresaNombre: pedido.empresaNombre,
      email: pedido.email,
      downloadUrl:
        pedido.estado === 'ready'
          ? `${siteUrl}/api/informes/download/${encodeURIComponent(pedido.codigo)}`
          : null,
      verifyUrl: `${siteUrl}/verificar/${pedido.codigo}`,
      verificacion: pedido.estado === 'ready' ? toVerificacionPublica(pedido) : null,
      errorMessage: pedido.errorMessage ?? null,
    });
  } catch (error) {
    console.error('[informes/status]', error);
    return NextResponse.json({ error: 'Estado no disponible' }, { status: 503 });
  }
}
