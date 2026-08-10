import 'server-only';

import { sendEmail } from '@/lib/email';
import { getSiteUrl } from '@/lib/seo';
import type { StoredReclamoDocument } from '@/types/reclamos';

function caseLabel(reclamo: Pick<StoredReclamoDocument, 'id' | 'resumen' | 'denunciante'>): string {
  const nombre = `${reclamo.denunciante.nombre} ${reclamo.denunciante.apellido}`.trim();
  return `#${reclamo.id}${nombre ? ` — ${nombre}` : ''}${reclamo.resumen ? `\nResumen: ${reclamo.resumen}` : ''}`;
}

function detailUrl(reclamoId: number): string {
  return `${getSiteUrl()}/admin/reclamos/${reclamoId}`;
}

export function notifyAsignacionPropuesta(
  reclamo: StoredReclamoDocument,
  assignee: { email: string; name: string },
  proposedBy: { email: string; name: string }
): void {
  const url = detailUrl(reclamo.id);
  sendEmail({
    to: assignee.email,
    subject: `UCU — Caso #${reclamo.id} pendiente de aceptación`,
    body: `Hola ${assignee.name},

${proposedBy.name} te asignó el reclamo ${caseLabel(reclamo)}.

El caso quedó en estado "Espera aceptación". Abrí el enlace y aceptá o rechazá la asignación:

${url}

Si no podés tomarlo, rechazalo para que el equipo lo reasigne.

— UCU Admin`,
    reclamoId: reclamo.id,
  }).catch((err) => console.error('[email asignacion propuesta]', err));
}

export function notifyAsignacionAceptada(
  reclamo: StoredReclamoDocument,
  assignee: { email: string; name: string },
  notifyEmail: string
): void {
  if (!notifyEmail) return;
  const url = detailUrl(reclamo.id);
  sendEmail({
    to: notifyEmail,
    subject: `UCU — ${assignee.name} aceptó el caso #${reclamo.id}`,
    body: `Buenas,

${assignee.name} (${assignee.email}) aceptó la asignación del reclamo ${caseLabel(reclamo)}.

Ya figura como responsable y el caso pasó a gestión.

${url}

— UCU Admin`,
    reclamoId: reclamo.id,
  }).catch((err) => console.error('[email asignacion aceptada]', err));
}

export function notifyAsignacionRechazada(
  reclamo: StoredReclamoDocument,
  assignee: { email: string; name: string },
  notifyEmail: string,
  motivo?: string
): void {
  if (!notifyEmail) return;
  const url = detailUrl(reclamo.id);
  const motivoLine = motivo?.trim() ? `\nMotivo: ${motivo.trim()}\n` : '';
  sendEmail({
    to: notifyEmail,
    subject: `UCU — ${assignee.name} rechazó el caso #${reclamo.id}`,
    body: `Buenas,

${assignee.name} (${assignee.email}) rechazó la asignación del reclamo ${caseLabel(reclamo)}.
${motivoLine}
El caso volvió a quedar disponible para reasignar.

${url}

— UCU Admin`,
    reclamoId: reclamo.id,
  }).catch((err) => console.error('[email asignacion rechazada]', err));
}
