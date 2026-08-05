import 'server-only';

import { getAdminStorage } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/email';
import { getGeminiApiKey, generateInformeSintesis } from '@/lib/gemini';
import {
  buildInformeStatsSnapshot,
  normalizeInformeStatsSnapshot,
  pickMuestrasAnonimas,
} from '@/lib/informe-data';
import { buildInformePdfBuffer } from '@/lib/informe-pdf';
import {
  getInformeById,
  getInformeByPaymentId,
  hashPdfBuffer,
  updateInformePedido,
} from '@/lib/informes-store';
import { fetchMercadoPagoPayment } from '@/lib/mercadopago';
import { searchReclamosIndex } from '@/lib/reclamos-search-index';
import { getSiteUrl } from '@/lib/seo';
import type { InformePedido, InformeStatsSnapshot } from '@/types/informes';

function storageOrThrow() {
  const storage = getAdminStorage();
  if (!storage) throw new Error('Firebase Storage no configurado.');
  return storage;
}

export function informePdfStoragePath(pedido: InformePedido): string {
  return `informes/${pedido.id}/${pedido.codigo}.pdf`;
}

async function uploadInformePdf(pedido: InformePedido, buffer: Buffer): Promise<string> {
  const storage = storageOrThrow();
  const path = informePdfStoragePath(pedido);
  const file = storage.bucket().file(path);
  await file.save(buffer, {
    metadata: {
      contentType: 'application/pdf',
      metadata: {
        codigo: pedido.codigo,
        empresaId: String(pedido.empresaId),
        pedidoId: pedido.id,
      },
    },
  });
  return path;
}

export async function downloadInformePdfBuffer(pedido: InformePedido): Promise<Buffer | null> {
  if (!pedido.pdfPath) return null;
  const storage = storageOrThrow();
  const [buffer] = await storage.bucket().file(pedido.pdfPath).download();
  return buffer;
}

async function sendInformeReadyEmail(pedido: InformePedido): Promise<void> {
  const siteUrl = getSiteUrl();
  const downloadUrl = `${siteUrl}/api/informes/download/${encodeURIComponent(pedido.codigo)}`;
  const verifyUrl = `${siteUrl}/verificar/${pedido.codigo}`;

  await sendEmail({
    to: pedido.email,
    subject: `Tu informe UCU está listo — ${pedido.codigo}`,
    body: [
      `Hola,`,
      ``,
      `Ya está listo tu informe de reclamos sobre ${pedido.empresaNombre}.`,
      ``,
      `Código de verificación: ${pedido.codigo}`,
      `Descargar PDF: ${downloadUrl}`,
      `Validar emisión: ${verifyUrl}`,
      ``,
      `Conservá el código: cualquier persona puede comprobar en ucu.org.ar que el documento fue emitido por UCU.`,
      ``,
      `— Usuarios y Consumidores Unidos`,
    ].join('\n'),
  });
}

async function enrichSnapshotWithAi(
  pedido: InformePedido,
  snapshot: InformeStatsSnapshot
): Promise<InformeStatsSnapshot> {
  if (snapshot.sintesis?.trim()) return snapshot;
  if (!getGeminiApiKey()) return snapshot;

  try {
    const search = await searchReclamosIndex({ empresaId: pedido.empresaId });
    const enriched = await generateInformeSintesis({
      empresaNombre: pedido.empresaNombre,
      total: snapshot.total,
      rangoFechas: snapshot.rangoFechas,
      porCausa: snapshot.porCausa,
      muestras: pickMuestrasAnonimas(search.hits),
    });
    return {
      ...snapshot,
      sintesis: enriched.sintesis,
      temas: enriched.temas,
    };
  } catch (error) {
    console.error('[informe-fulfill] síntesis IA omitida', error);
    return snapshot;
  }
}

/**
 * Idempotent: approved payment → PDF → store → email.
 * Safe to call from webhook retries.
 */
export async function fulfillInformeFromPaymentId(paymentId: string): Promise<InformePedido | null> {
  const payment = await fetchMercadoPagoPayment(paymentId);

  if (payment.status !== 'approved') {
    if (payment.externalReference) {
      const existing = await getInformeById(payment.externalReference);
      if (existing) {
        await updateInformePedido(existing.id, {
          mpPaymentId: payment.id,
          mpStatus: payment.status,
        });
      }
    }
    return null;
  }

  let pedido =
    (payment.externalReference ? await getInformeById(payment.externalReference) : null) ||
    (await getInformeByPaymentId(payment.id));

  if (!pedido) {
    console.error('[informe-fulfill] pedido no encontrado para payment', paymentId);
    return null;
  }

  if (pedido.estado === 'ready' && pedido.pdfPath && pedido.pdfHash) {
    return pedido;
  }

  const paidAt = pedido.paidAt || new Date().toISOString();
  pedido = await updateInformePedido(pedido.id, {
    estado: 'paid',
    mpPaymentId: payment.id,
    mpStatus: payment.status,
    paidAt,
  });

  try {
    let snapshot = normalizeInformeStatsSnapshot(pedido.statsSnapshot);
    if (!snapshot.porCausa.length) {
      const fresh = await buildInformeStatsSnapshot(pedido.empresaId);
      if (fresh) snapshot = fresh;
    }
    snapshot = await enrichSnapshotWithAi(pedido, snapshot);

    pedido = await updateInformePedido(pedido.id, {
      statsSnapshot: snapshot,
    });

    const readyAt = new Date().toISOString();
    const buffer = await buildInformePdfBuffer({ ...pedido, readyAt, statsSnapshot: snapshot });
    const pdfHash = hashPdfBuffer(buffer);
    const pdfPath = await uploadInformePdf(pedido, buffer);

    const ready = await updateInformePedido(pedido.id, {
      estado: 'ready',
      pdfPath,
      pdfHash,
      pdfBytes: buffer.length,
      readyAt,
      errorMessage: null,
      statsSnapshot: snapshot,
    });

    try {
      await sendInformeReadyEmail(ready);
    } catch (emailError) {
      console.error('[informe-fulfill] email failed', emailError);
    }

    return ready;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error generando informe';
    console.error('[informe-fulfill]', message, error);
    await updateInformePedido(pedido.id, {
      estado: 'failed',
      errorMessage: message,
    });
    throw error;
  }
}

export async function tryFulfillPedidoIfPaid(pedidoId: string, paymentId?: string | null) {
  if (paymentId) {
    return fulfillInformeFromPaymentId(paymentId);
  }

  const pedido = await getInformeById(pedidoId);
  if (!pedido) return null;
  if (pedido.estado === 'ready') return pedido;
  if (pedido.mpPaymentId) {
    return fulfillInformeFromPaymentId(pedido.mpPaymentId);
  }
  return pedido;
}
