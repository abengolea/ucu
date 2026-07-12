import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import {
  extractDisplayName,
  extractEmailAddress,
  normalizeInboundEmailBody,
  parseReclamoIdFromAddresses,
  parseReclamoIdFromSubject,
} from '@/lib/reclamos-email-thread';
import {
  addReclamoComunicacionEntrante,
  findReclamoIdsByDenuncianteEmail,
  getReclamoByIdFromFirestore,
} from '@/lib/reclamos-store';

type ResendReceivedWebhook = {
  type: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
    received_for?: string[];
    subject?: string;
    created_at?: string;
  };
};

async function fetchReceivedEmailContent(emailId: string): Promise<{ text?: string; html?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error('RESEND_API_KEY no configurada');

  const response = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const data = (await response.json()) as {
    text?: string;
    html?: string;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message || `Resend receiving API ${response.status}`);
  }

  return data;
}

async function resolveReclamoId(event: NonNullable<ResendReceivedWebhook['data']>): Promise<number | null> {
  const addresses = [
    ...(event.to ?? []),
    ...(event.cc ?? []),
    ...(event.bcc ?? []),
    ...(event.received_for ?? []),
  ];

  const byAddress = parseReclamoIdFromAddresses(addresses);
  if (byAddress) return byAddress;

  const bySubject = parseReclamoIdFromSubject(event.subject ?? '');
  if (bySubject) return bySubject;

  const fromEmail = extractEmailAddress(event.from ?? '');
  const candidateIds = await findReclamoIdsByDenuncianteEmail(fromEmail);
  if (candidateIds.length === 1) return candidateIds[0];

  return null;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'Email no configurado' }, { status: 503 });
  }

  const rawBody = await request.text();

  try {
    const resend = new Resend(apiKey);
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();
    let event: ResendReceivedWebhook;

    if (webhookSecret && 'webhooks' in resend && typeof resend.webhooks?.verify === 'function') {
      event = resend.webhooks.verify({
        payload: rawBody,
        headers: {
          id: request.headers.get('svix-id') ?? '',
          timestamp: request.headers.get('svix-timestamp') ?? '',
          signature: request.headers.get('svix-signature') ?? '',
        },
        webhookSecret,
      }) as ResendReceivedWebhook;
    } else {
      event = JSON.parse(rawBody) as ResendReceivedWebhook;
    }

    if (event.type !== 'email.received' || !event.data?.email_id) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const reclamoId = await resolveReclamoId(event.data);
    if (!reclamoId) {
      console.warn('[resend-inbound] No se pudo asociar email a un reclamo', {
        subject: event.data.subject,
        to: event.data.to,
        from: event.data.from,
      });
      return NextResponse.json({ ok: true, matched: false });
    }

    const reclamo = await getReclamoByIdFromFirestore(reclamoId);
    if (!reclamo) {
      return NextResponse.json({ ok: true, matched: false });
    }

    const content = await fetchReceivedEmailContent(event.data.email_id);
    const body = normalizeInboundEmailBody(content.text, content.html);
    if (!body) {
      return NextResponse.json({ error: 'Email sin contenido utilizable' }, { status: 400 });
    }

    const fromRaw = event.data.from ?? reclamo.denunciante.email;
    await addReclamoComunicacionEntrante(reclamoId, {
      from: extractEmailAddress(fromRaw),
      subject: event.data.subject?.trim() || '(sin asunto)',
      body,
      sentAt: event.data.created_at,
      sentByName: extractDisplayName(fromRaw) || `${reclamo.denunciante.nombre} ${reclamo.denunciante.apellido}`.trim(),
    });

    return NextResponse.json({ ok: true, matched: true, reclamoId });
  } catch (error) {
    console.error('[resend-inbound]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error procesando email entrante' },
      { status: 500 }
    );
  }
}
