import 'server-only';

import { getAdminDb } from '@/lib/firebase-admin';
import type { AdminUserAuthRecord } from '@/types/admin-users';

const COLLECTION = 'admin_users';

export function normalizeAssigneeEmail(email: string | undefined): string {
  return email?.trim().toLowerCase() ?? '';
}

export function normalizePersonName(name: string | undefined): string {
  return (name ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
}

function parseAlternateEmails(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => normalizeAssigneeEmail(item))
    .filter(Boolean);
}

function docToAssigneeIdentity(
  id: string,
  data: FirebaseFirestore.DocumentData
): AdminUserAuthRecord {
  return {
    email: normalizeAssigneeEmail(data.email ?? id),
    name: typeof data.name === 'string' ? data.name.trim() : '',
    role: (data.role as AdminUserAuthRecord['role']) ?? 'editor',
    active: data.active !== false,
    reclamosWriteScope:
      data.reclamosWriteScope === 'assigned' || data.reclamosWriteScope === 'all'
        ? data.reclamosWriteScope
        : 'all',
    hasPassword: Boolean(data.passwordHash || data.legacyPasswordHash),
    alternateEmails: parseAlternateEmails(data.alternateEmails),
    legacyUsername: typeof data.legacyUsername === 'string' ? data.legacyUsername : undefined,
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  };
}

export function collectAssigneeEmails(
  user: Pick<AdminUserAuthRecord, 'email' | 'alternateEmails'>,
  loginEmail?: string
): string[] {
  const emails = new Set<string>();
  const primary = normalizeAssigneeEmail(user.email);
  if (primary) emails.add(primary);
  if (loginEmail) emails.add(normalizeAssigneeEmail(loginEmail));
  for (const email of user.alternateEmails ?? []) {
    const normalized = normalizeAssigneeEmail(email);
    if (normalized) emails.add(normalized);
  }
  return [...emails];
}

export async function findAdminUserByAnyEmail(
  email: string
): Promise<AdminUserAuthRecord | null> {
  const normalized = normalizeAssigneeEmail(email);
  if (!normalized) return null;

  const db = getAdminDb();
  if (!db) return null;

  const direct = await db.collection(COLLECTION).doc(normalized).get();
  if (direct.exists) {
    const user = docToAssigneeIdentity(direct.id, direct.data() ?? {});
    return user.active ? user : null;
  }

  const aliasSnap = await db
    .collection(COLLECTION)
    .where('alternateEmails', 'array-contains', normalized)
    .limit(1)
    .get();

  if (!aliasSnap.empty) {
    const doc = aliasSnap.docs[0];
    const user = docToAssigneeIdentity(doc.id, doc.data() ?? {});
    return user.active ? user : null;
  }

  return null;
}

export async function getAssigneeMatchEmails(loginEmail: string): Promise<string[]> {
  const normalized = normalizeAssigneeEmail(loginEmail);
  const linked = await findAdminUserByAnyEmail(normalized);

  if (linked) {
    return collectAssigneeEmails(linked, normalized);
  }

  return normalized ? [normalized] : [];
}

export async function getAssigneeMatchContext(loginEmail: string): Promise<{
  emails: string[];
  name?: string;
}> {
  const normalized = normalizeAssigneeEmail(loginEmail);
  const linked = await findAdminUserByAnyEmail(normalized);

  if (linked) {
    return {
      emails: collectAssigneeEmails(linked, normalized),
      name: linked.name || undefined,
    };
  }

  return { emails: normalized ? [normalized] : [] };
}

export function reclamoAssignedToIdentity(
  reclamo: {
    responsable?: { email?: string; name?: string } | null;
    asignacionPendiente?: { email?: string; name?: string } | null;
  },
  emails: string[],
  assigneeName?: string
): boolean {
  const pendingEmail = normalizeAssigneeEmail(reclamo.asignacionPendiente?.email);
  if (pendingEmail && emails.includes(pendingEmail)) return true;

  const assignedEmail = normalizeAssigneeEmail(reclamo.responsable?.email);
  if (assignedEmail && emails.includes(assignedEmail)) return true;

  const targetName = normalizePersonName(assigneeName);
  const pendingName = normalizePersonName(reclamo.asignacionPendiente?.name);
  if (targetName && pendingName && targetName === pendingName) return true;

  const assignedName = normalizePersonName(reclamo.responsable?.name);
  return Boolean(targetName && assignedName && targetName === assignedName);
}

export function reclamoPendingForIdentity(
  reclamo: { asignacionPendiente?: { email?: string } | null },
  emails: string[]
): boolean {
  const pendingEmail = normalizeAssigneeEmail(reclamo.asignacionPendiente?.email);
  return Boolean(pendingEmail && emails.includes(pendingEmail));
}
