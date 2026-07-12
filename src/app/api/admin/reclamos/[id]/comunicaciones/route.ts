import { NextRequest, NextResponse } from 'next/server';
import {
  addReclamoComunicacion,
  addReclamoComunicacionEntrante,
} from '@/lib/reclamos-store';
import { sendEmail } from '@/lib/email';
import {
  buildReclamoReplyToAddress,
  ensureReclamoSubjectTag,
  extractDisplayName,
  extractEmailAddress,
  isReclamosInboundConfigured,
} from '@/lib/reclamos-email-thread';
import {
  reclamoWriteForbiddenResponse,
  requireReclamoWriteAccess,
} from '@/lib/reclamos-access';
import { requireAdminPermission } from '@/lib/admin-session';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const reclamoId = Number(id);
  if (!Number.isFinite(reclamoId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const access = await requireReclamoWriteAccess(request, reclamoId);
  if (!access) {
    const session = requireAdminPermission(request, 'reclamos:write');
    if (session) return reclamoWriteForbiddenResponse();
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { session, reclamo } = access;
  const body = await request.json();
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
  const text = typeof body?.body === 'string' ? body.body.trim() : '';
  const direction = body?.direction === 'inbound' ? 'inbound' : 'outbound';

  if (!subject || !text) {
    return NextResponse.json({ error: 'Asunto y cuerpo son requeridos' }, { status: 400 });
  }

  try {
    if (direction === 'inbound') {
      const from =
        typeof body?.from === 'string' && body.from.trim()
          ? extractEmailAddress(body.from)
          : extractEmailAddress(reclamo.denunciante.email);

      await addReclamoComunicacionEntrante(reclamoId, {
        from,
        subject,
        body: text,
        sentByName:
          typeof body?.fromName === 'string' && body.fromName.trim()
            ? body.fromName.trim()
            : extractDisplayName(body?.from ?? '') ||
              `${reclamo.denunciante.nombre} ${reclamo.denunciante.apellido}`.trim(),
      });

      return NextResponse.json({ ok: true, direction: 'inbound' });
    }

    const to = reclamo.denunciante.email;
    if (!to) {
      return NextResponse.json({ error: 'El denunciante no tiene email registrado' }, { status: 400 });
    }

    const viaIA = body?.viaIA === true;
    const taggedSubject = ensureReclamoSubjectTag(subject, reclamoId);
    const replyTo = buildReclamoReplyToAddress(reclamoId) ?? undefined;

    await sendEmail({
      to,
      subject: taggedSubject,
      body: text,
      replyTo,
      headers: {
        'X-Reclamo-Id': String(reclamoId),
      },
      tags: [{ name: 'reclamo_id', value: String(reclamoId) }],
    });

    await addReclamoComunicacion(reclamoId, {
      to,
      from: replyTo,
      subject: taggedSubject,
      body: text,
      sentAt: new Date().toISOString(),
      sentByEmail: session.email,
      sentByName: session.name,
      viaIA,
    });

    return NextResponse.json({
      ok: true,
      direction: 'outbound',
      replyToConfigured: isReclamosInboundConfigured(),
      replyTo: replyTo ?? null,
    });
  } catch (error) {
    console.error('[comunicaciones]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo registrar la comunicación' },
      { status: 500 }
    );
  }
}
