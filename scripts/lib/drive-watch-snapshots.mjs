import crypto from 'node:crypto';
import { classifyMime, normalizeText } from './drive-watch-shared.mjs';

export const SNAPSHOTS_COLLECTION = 'drive_file_snapshots';
export const MAX_TEXT_STORE = 100_000;

export function hashNormalizedText(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Baseline snapshot for Drive watch. No alerts — just the starting text.
 */
export function buildSnapshotRecord({
  reclamoId,
  fileId,
  folderId = null,
  fileName,
  mimeType,
  md5Checksum = null,
  headRevisionId = null,
  driveModifiedTime = null,
  driveUrl = null,
  rawText = '',
  source = 'import',
}) {
  const normalized = normalizeText(rawText || '').slice(0, MAX_TEXT_STORE);
  const now = new Date().toISOString();
  return {
    fileId,
    reclamoId: Number(reclamoId),
    folderId: folderId || null,
    fileName: fileName || fileId,
    fileType: classifyMime(mimeType),
    mimeType: mimeType || null,
    driveUrl: driveUrl || null,
    md5Checksum: md5Checksum || null,
    headRevisionId: headRevisionId || null,
    driveModifiedTime: driveModifiedTime || null,
    normalizedTextHash: hashNormalizedText(normalized),
    normalizedText: normalized,
    textSnapshotDate: now,
    lastCheckedAt: now,
    lastChangedAt: null,
    lastDiffStats: null,
    inaccessible: false,
    source,
  };
}

export async function writeDriveSnapshot(db, record, { dryRun = false } = {}) {
  if (dryRun || !record?.fileId) return;
  await db.collection(SNAPSHOTS_COLLECTION).doc(record.fileId).set(record, { merge: true });
}
