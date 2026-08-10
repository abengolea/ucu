import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { hasPermission } from '@/lib/admin-roles';
import {
  getAssigneeMatchContext,
  reclamoAssignedToIdentity,
  reclamoPendingForIdentity,
} from '@/lib/admin-assignee-identity';
import { requireAdminPermission, type AdminSession } from '@/lib/admin-session';
import { getReclamoByIdFromFirestore } from '@/lib/reclamos-store';
import type { StoredReclamoDocument } from '@/types/reclamos';

export { getReclamosWriteScopeForRole } from '@/lib/admin-roles';

export async function canWriteReclamo(
  session: Pick<AdminSession, 'email' | 'name' | 'permissions' | 'reclamosWriteScope'>,
  reclamo: Pick<StoredReclamoDocument, 'responsable' | 'asignacionPendiente'>
): Promise<boolean> {
  if (!hasPermission(session.permissions, 'reclamos:write')) return false;
  if (session.reclamosWriteScope !== 'assigned') return true;

  const { emails, name } = await getAssigneeMatchContext(session.email);
  // Escritura plena solo si ya es responsable — la propuesta pendiente usa canDecideAsignacion.
  return reclamoAssignedToIdentity(
    { responsable: reclamo.responsable },
    emails,
    name ?? session.name
  );
}

export async function canDecideAsignacion(
  session: Pick<AdminSession, 'email' | 'permissions'>,
  reclamo: Pick<StoredReclamoDocument, 'asignacionPendiente'>
): Promise<boolean> {
  if (!hasPermission(session.permissions, 'reclamos:write')) return false;
  if (!reclamo.asignacionPendiente?.email) return false;
  const { emails } = await getAssigneeMatchContext(session.email);
  return reclamoPendingForIdentity(reclamo, emails);
}

export async function requireReclamoWriteAccess(
  request: NextRequest,
  reclamoId: number
): Promise<{ session: AdminSession; reclamo: StoredReclamoDocument } | null> {
  const session = requireAdminPermission(request, 'reclamos:write');
  if (!session) return null;

  const reclamo = await getReclamoByIdFromFirestore(reclamoId);
  if (!reclamo) return null;
  if (!(await canWriteReclamo(session, reclamo))) return null;

  return { session, reclamo };
}

/** Write access OR proposed-delegate decision on a pending assignment. */
export async function requireReclamoWriteOrAsignacionAccess(
  request: NextRequest,
  reclamoId: number
): Promise<{ session: AdminSession; reclamo: StoredReclamoDocument } | null> {
  const session = requireAdminPermission(request, 'reclamos:write');
  if (!session) return null;

  const reclamo = await getReclamoByIdFromFirestore(reclamoId);
  if (!reclamo) return null;

  if (await canWriteReclamo(session, reclamo)) {
    return { session, reclamo };
  }
  if (await canDecideAsignacion(session, reclamo)) {
    return { session, reclamo };
  }

  return null;
}

export function reclamoWriteForbiddenResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Solo podés editar reclamos asignados a vos.' },
    { status: 403 }
  );
}
