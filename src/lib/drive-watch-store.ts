import 'server-only';

import { getAdminDb } from '@/lib/firebase-admin';
import type { DriveChangeAlert, DrivePollingState } from '@/types/drive-watch';

const ALERTS = 'drive_change_alerts';
const META = 'drive_polling_state';

function dbOrThrow() {
  const db = getAdminDb();
  if (!db) throw new Error('Firebase Admin no configurado.');
  return db;
}

function mapAlert(id: string, data: Record<string, unknown>): DriveChangeAlert {
  return {
    id,
    reclamoId: Number(data.reclamoId),
    fileId: String(data.fileId || ''),
    fileName: String(data.fileName || data.fileId || ''),
    status: (data.status as DriveChangeAlert['status']) || 'open',
    tier: data.tier === 'high' ? 'high' : 'medium',
    relevanceScore: Number(data.relevanceScore || 0),
    matchedSignals: Array.isArray(data.matchedSignals) ? data.matchedSignals.map(String) : [],
    detectedAt: String(data.detectedAt || ''),
    lastActivityAt: String(data.lastActivityAt || data.detectedAt || ''),
    diffStats: (data.diffStats as DriveChangeAlert['diffStats']) ?? null,
    diffSnippet: (data.diffSnippet as string | null) ?? null,
    driveUrl: (data.driveUrl as string | null) ?? null,
    reviewedBy: data.reviewedBy as string | undefined,
    reviewedAt: data.reviewedAt as string | undefined,
  };
}

export async function listDriveChangeAlerts(options?: {
  status?: 'open' | 'all' | 'closed';
  limit?: number;
}): Promise<DriveChangeAlert[]> {
  const db = dbOrThrow();
  const limit = options?.limit ?? 200;
  const status = options?.status ?? 'open';

  let snap;
  try {
    snap = await db.collection(ALERTS).orderBy('lastActivityAt', 'desc').limit(500).get();
  } catch {
    snap = await db.collection(ALERTS).limit(500).get();
  }

  let items = snap.docs.map((doc) => mapAlert(doc.id, doc.data() as Record<string, unknown>));
  items.sort((a, b) => (b.lastActivityAt || '').localeCompare(a.lastActivityAt || ''));

  if (status === 'open') {
    items = items.filter((a) => a.status === 'open' || a.status === 'needs_review');
  } else if (status === 'closed') {
    items = items.filter((a) => a.status === 'ignored' || a.status === 'reviewed');
  }

  return items.slice(0, limit);
}

export async function updateDriveChangeAlertStatus(
  alertId: string,
  status: 'ignored' | 'reviewed',
  operator: { email: string; name?: string }
): Promise<DriveChangeAlert | null> {
  const db = dbOrThrow();
  const ref = db.collection(ALERTS).doc(alertId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const now = new Date().toISOString();
  await ref.set(
    {
      status,
      reviewedBy: operator.email,
      reviewedAt: now,
    },
    { merge: true }
  );

  const updated = await ref.get();
  return mapAlert(updated.id, (updated.data() || {}) as Record<string, unknown>);
}

export async function getDrivePollingState(): Promise<DrivePollingState | null> {
  const db = dbOrThrow();
  const snap = await db.collection(META).doc('default').get();
  if (!snap.exists) return null;
  return snap.data() as DrivePollingState;
}

export async function countOpenDriveAlerts(): Promise<number> {
  const items = await listDriveChangeAlerts({ status: 'open', limit: 500 });
  return items.length;
}
