import 'server-only';

import { getAdminDb } from '@/lib/firebase-admin';
import { hashAdminPassword } from '@/lib/admin-password';
import { getAllowedAdminEmails } from '@/lib/admin-session';
import { getPermissionsForRole, getReclamosWriteScopeForRole } from '@/lib/admin-roles';
import type {
  AdminRole,
  AdminSessionUser,
  AdminUser,
  AdminUserAuthRecord,
  ReclamosWriteScope,
} from '@/types/admin-users';

const COLLECTION = 'admin_users';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function docToUser(id: string, data: FirebaseFirestore.DocumentData): AdminUserAuthRecord {
  const role = (data.role as AdminRole) ?? 'editor';
  const reclamosWriteScope = getReclamosWriteScopeForRole(
    role,
    data.reclamosWriteScope as ReclamosWriteScope | undefined
  );

  return {
    email: normalizeEmail(data.email ?? id),
    name: typeof data.name === 'string' ? data.name.trim() : '',
    role,
    active: data.active !== false,
    reclamosWriteScope,
    hasPassword: Boolean(data.passwordHash || data.legacyPasswordHash),
    passwordHash: typeof data.passwordHash === 'string' ? data.passwordHash : undefined,
    legacyPasswordHash:
      typeof data.legacyPasswordHash === 'string' ? data.legacyPasswordHash : undefined,
    legacyUsername: typeof data.legacyUsername === 'string' ? data.legacyUsername : undefined,
    alternateEmails: Array.isArray(data.alternateEmails)
      ? data.alternateEmails
          .filter((item): item is string => typeof item === 'string')
          .map((item) => normalizeEmail(item))
          .filter(Boolean)
      : undefined,
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : undefined,
  };
}

function toPublicUser(user: AdminUserAuthRecord): AdminUser {
  const { passwordHash: _p, legacyPasswordHash: _l, legacyUsername: _u, ...publicUser } = user;
  return publicUser;
}

function envBootstrapUser(email: string): AdminUserAuthRecord {
  const now = new Date().toISOString();
  return {
    email: normalizeEmail(email),
    name: email.split('@')[0] ?? email,
    role: 'administrador',
    active: true,
    reclamosWriteScope: 'all',
    hasPassword: Boolean(process.env.ADMIN_PANEL_PASSWORD?.trim()),
    createdAt: now,
    updatedAt: now,
  };
}

export async function getAdminUserAuthRecord(email: string): Promise<AdminUserAuthRecord | null> {
  const normalized = normalizeEmail(email);
  const db = getAdminDb();

  if (db) {
    const snap = await db.collection(COLLECTION).doc(normalized).get();
    if (snap.exists) {
      const user = docToUser(snap.id, snap.data() ?? {});
      return user.active ? user : null;
    }
  }

  if (getAllowedAdminEmails().includes(normalized)) {
    const { findAdminUserByAnyEmail } = await import('@/lib/admin-assignee-identity');
    const linked = await findAdminUserByAnyEmail(normalized);
    const bootstrap = envBootstrapUser(normalized);
    if (linked?.name) {
      return { ...bootstrap, name: linked.name, legacyUsername: linked.legacyUsername };
    }
    return bootstrap;
  }

  const { findAdminUserByAnyEmail } = await import('@/lib/admin-assignee-identity');
  const linked = await findAdminUserByAnyEmail(normalized);
  if (linked) {
    return { ...linked, email: normalized };
  }

  return null;
}

export async function getAdminUserByEmail(email: string): Promise<AdminUser | null> {
  const user = await getAdminUserAuthRecord(email);
  return user ? toPublicUser(user) : null;
}

export async function resolveAdminSessionUser(email: string): Promise<AdminSessionUser | null> {
  const user = await getAdminUserAuthRecord(email);
  if (!user) return null;

  return {
    email: user.email,
    name: user.name || user.email.split('@')[0] || user.email,
    role: user.role,
    permissions: getPermissionsForRole(user.role),
    reclamosWriteScope: user.reclamosWriteScope,
  };
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const db = getAdminDb();
  if (!db) return [];

  const snap = await db.collection(COLLECTION).orderBy('createdAt', 'desc').get();
  const users = snap.docs.map((doc) => toPublicUser(docToUser(doc.id, doc.data())));

  /** Emails ya cubiertos como primario o alias — evita duplicar ADMIN_PANEL_EMAIL en el listado. */
  const knownEmails = new Set<string>();
  for (const user of users) {
    knownEmails.add(user.email);
    for (const alt of user.alternateEmails ?? []) {
      knownEmails.add(normalizeEmail(alt));
    }
  }
  for (const email of getAllowedAdminEmails()) {
    if (!knownEmails.has(email)) {
      users.unshift(toPublicUser(envBootstrapUser(email)));
    }
  }

  return users.sort((a, b) => a.email.localeCompare(b.email, 'es'));
}

export async function listReclamosDelegados(): Promise<{ email: string; name: string }[]> {
  const users = await listAdminUsers();
  return users
    .filter((user) => user.active && getPermissionsForRole(user.role).includes('reclamos:write'))
    .map((user) => ({
      email: user.email,
      name: user.name.trim() || user.email.split('@')[0] || user.email,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export type UpsertAdminUserInput = Pick<AdminUser, 'email' | 'name' | 'role' | 'active'> & {
  reclamosWriteScope?: ReclamosWriteScope;
  createdBy?: string;
  password?: string;
  legacyPasswordHash?: string;
  legacyUsername?: string;
  clearLegacyPassword?: boolean;
};

export async function upsertAdminUser(input: UpsertAdminUserInput): Promise<AdminUser> {
  const db = getAdminDb();
  if (!db) throw new Error('Firebase no configurado');

  const email = normalizeEmail(input.email);
  const now = new Date().toISOString();
  const ref = db.collection(COLLECTION).doc(email);
  const existing = await ref.get();
  const existingData = existing.exists ? (existing.data() ?? {}) : {};

  const reclamosWriteScope = getReclamosWriteScopeForRole(
    input.role,
    input.reclamosWriteScope ?? (existingData.reclamosWriteScope as ReclamosWriteScope | undefined)
  );

  const payload: Record<string, unknown> = {
    email,
    name: input.name.trim(),
    role: input.role,
    active: input.active,
    reclamosWriteScope,
    updatedAt: now,
    ...(existing.exists
      ? {}
      : {
          createdAt: now,
          createdBy: input.createdBy,
        }),
  };

  if (typeof input.password === 'string' && input.password.trim()) {
    payload.passwordHash = await hashAdminPassword(input.password.trim());
    payload.legacyPasswordHash = null;
    payload.legacyUsername = null;
  }

  if (typeof input.legacyPasswordHash === 'string' && input.legacyPasswordHash.trim()) {
    payload.legacyPasswordHash = input.legacyPasswordHash.trim().toLowerCase();
  }

  if (typeof input.legacyUsername === 'string' && input.legacyUsername.trim()) {
    payload.legacyUsername = input.legacyUsername.trim();
  }

  if (input.clearLegacyPassword) {
    payload.legacyPasswordHash = null;
    payload.legacyUsername = null;
  }

  if (!payload.passwordHash && !payload.legacyPasswordHash) {
    if (existingData.passwordHash) payload.passwordHash = existingData.passwordHash;
    if (existingData.legacyPasswordHash) payload.legacyPasswordHash = existingData.legacyPasswordHash;
    if (existingData.legacyUsername) payload.legacyUsername = existingData.legacyUsername;
  }

  await ref.set(payload, { merge: true });
  const saved = await ref.get();
  return toPublicUser(docToUser(saved.id, saved.data() ?? {}));
}

export async function deleteAdminUser(email: string): Promise<boolean> {
  const db = getAdminDb();
  if (!db) throw new Error('Firebase no configurado');

  const normalized = normalizeEmail(email);
  if (getAllowedAdminEmails().includes(normalized)) {
    throw new Error('No se puede eliminar un usuario definido en variables de entorno');
  }

  await db.collection(COLLECTION).doc(normalized).delete();
  return true;
}

export async function upgradeAdminPassword(email: string, password: string): Promise<void> {
  const db = getAdminDb();
  if (!db) return;

  const normalized = normalizeEmail(email);
  await db.collection(COLLECTION).doc(normalized).set(
    {
      passwordHash: await hashAdminPassword(password.trim()),
      legacyPasswordHash: null,
      legacyUsername: null,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}
