import 'server-only';

import { sendEmail } from '@/lib/email';
import { getSiteUrl } from '@/lib/seo';
import type { StoredReclamoDocument } from '@/types/reclamos';

export type AsignacionNotifyResult = {
  reclamo: StoredReclamoDocument;
  emailError?: string;
};

function notifyErrorMessage(action: string, err: unknown): string {
  const detail = err instanceof Error ? err.message : 'error desconocido';
  return `El caso se actualizó, pero no se pudo enviar el mail (${action}): ${detail}`;
}

export async function runAsignacionNotify(
  reclamo: StoredReclamoDocument,
  action: string,
  send: () => Promise<void>
): Promise<AsignacionNotifyResult> {
  try {
    await send();
    return { reclamo };
  } catch (err) {
    console.error(`[email asignacion ${action}]`, err);
    return { reclamo, emailError: notifyErrorMessage(action, err) };
  }
}

function caseLabel(reclamo: Pick<StoredReclamoDocument, 'id' | 'resumen' | 'denunciante'>): string {
  const nombre = `${reclamo.denunciante.nombre} ${reclamo.denunciante.apellido}`.trim();
  return `#${reclamo.id}${nombre ? ` — ${nombre}` : ''}${reclamo.resumen ? `\nResumen: ${reclamo.resumen}` : ''}`;
}

function detailUrl(reclamoId: number): string {
  return `${getSiteUrl()}/admin/reclamos/${reclamoId}`;
}

export async function notifyAsignacionPropuesta(
  reclamo: StoredReclamoDocument,
  assignee: { email: string; name: string },
  proposedBy: { email: string; name: string }
): Promise<void> {
  const url = detailUrl(reclamo.id);
  await sendEmail({
    to: assignee.email,
    subject: `UCU — Caso #${reclamo.id} pendiente de aceptación`,
    body: `Hola ${assignee.name},

${proposedBy.name} te asignó el reclamo ${caseLabel(reclamo)}.

El caso quedó en estado "Espera aceptación". Abrí el enlace y aceptá o rechazá la asignación:

${url}

Si no podés tomarlo, rechazalo para que el equipo lo reasigne.

— UCU Admin`,
    reclamoId: reclamo.id,
  });
}

export async function notifyAsignacionAceptada(
  reclamo: StoredReclamoDocument,
  assignee: { email: string; name: string },
  notifyEmail: string
): Promise<void> {
  if (!notifyEmail) return;
  const url = detailUrl(reclamo.id);
  await sendEmail({
    to: notifyEmail,
    subject: `UCU — ${assignee.name} aceptó el caso #${reclamo.id}`,
    body: `Buenas,

${assignee.name} (${assignee.email}) aceptó la asignación del reclamo ${caseLabel(reclamo)}.

Ya figura como responsable y el caso pasó a gestión.

${url}

— UCU Admin`,
    reclamoId: reclamo.id,
  });
}

export async function notifyAsignacionRechazada(
  reclamo: StoredReclamoDocument,
  assignee: { email: string; name: string },
  notifyEmail: string,
  motivo?: string
): Promise<void> {
  if (!notifyEmail) return;
  const url = detailUrl(reclamo.id);
  const motivoLine = motivo?.trim() ? `\nMotivo: ${motivo.trim()}\n` : '';
  await sendEmail({
    to: notifyEmail,
    subject: `UCU — ${assignee.name} rechazó el caso #${reclamo.id}`,
    body: `Buenas,

${assignee.name} (${assignee.email}) rechazó la asignación del reclamo ${caseLabel(reclamo)}.
${motivoLine}
El caso volvió a quedar disponible para reasignar.

${url}

— UCU Admin`,
    reclamoId: reclamo.id,
  });
}
