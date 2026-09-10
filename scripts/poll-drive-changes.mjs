#!/usr/bin/env node
/**
 * Vigila archivos de Drive vinculados a reclamos y crea avisos si el
 * cambio parece relevante (hitos de estado / datos estructurales).
 *
 * Uso:
 *   node scripts/poll-drive-changes.mjs --dry-run
 *   node scripts/poll-drive-changes.mjs --bootstrap   # registra snapshots iniciales
 *   node scripts/poll-drive-changes.mjs --limit=50
 *   node scripts/poll-drive-changes.mjs
 *
 * Env: GOOGLE_APPLICATION_CREDENTIALS / Firebase Admin, opcional DRIVE_RESOURCE_KEY
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { GoogleAuth } from 'google-auth-library';
import mammoth from 'mammoth';
import {
  buildDiffSnippet,
  classifyMime,
  diffParagraphs,
  isWatchableMime,
  MIME_GOOGLE_DOC,
  MIME_DOCX,
  MIME_PDF,
  normalizeText,
  parseDriveResourceFromUrl,
  scoreChanges,
  trim,
} from './lib/drive-watch-shared.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env.local') });

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const bootstrap = args.includes('--bootstrap');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : null;

const SNAPSHOTS = 'drive_file_snapshots';
const ALERTS = 'drive_change_alerts';
const META = 'drive_polling_state';
const MAX_TEXT_STORE = 100_000;
const CONCURRENCY = 3;

function initFirebase() {
  if (admin.apps.length) return admin.app();
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath && fs.existsSync(credentialsPath)) {
    return admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))),
    });
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Faltan credenciales Firebase Admin');
  }
  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

async function getDriveHeaders() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath || !fs.existsSync(credPath)) {
    throw new Error('Falta GOOGLE_APPLICATION_CREDENTIALS');
  }
  const auth = new GoogleAuth({
    keyFile: credPath,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  const client = await auth.getClient();
  const tokenRes = await client.getAccessToken();
  if (!tokenRes.token) throw new Error('Sin access token Drive');
  const headers = { Authorization: `Bearer ${tokenRes.token}` };
  // Optional legacy resource keys for shared folders
  const rk = process.env.DRIVE_RESOURCE_KEY?.trim();
  const folder = process.env.DRIVE_FOLDER_ID?.trim();
  if (rk && folder) {
    headers['X-Goog-Drive-Resource-Keys'] = `${folder}/${rk}`;
  }
  return headers;
}

async function driveJson(headers, url) {
  const res = await fetch(url, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || `Drive HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function driveBuffer(headers, url) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Drive download ${res.status}: ${text.slice(0, 160)}`);
    err.status = res.status;
    throw err;
  }
  return Buffer.from(await res.arrayBuffer());
}

async function getFileMeta(headers, fileId) {
  const fields =
    'id,name,mimeType,md5Checksum,headRevisionId,modifiedTime,webViewLink,size,trashed';
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=${fields}&supportsAllDrives=true`;
  return driveJson(headers, url);
}

async function listFolderChildren(headers, folderId) {
  const files = [];
  let pageToken = null;
  do {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', `'${folderId}' in parents and trashed=false`);
    url.searchParams.set(
      'fields',
      'nextPageToken,files(id,name,mimeType,md5Checksum,headRevisionId,modifiedTime,webViewLink,size)'
    );
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('supportsAllDrives', 'true');
    url.searchParams.set('includeItemsFromAllDrives', 'true');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const data = await driveJson(headers, url.toString());
    files.push(...(data.files || []));
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return files;
}

function pickPrimaryDoc(files) {
  const candidates = files.filter((f) => isWatchableMime(f.mimeType));
  if (!candidates.length) return null;
  const scored = candidates.map((d) => {
    let score = 0;
    const name = (d.name || '').toLowerCase();
    if (d.mimeType === MIME_GOOGLE_DOC) score += 5;
    if (d.mimeType === MIME_DOCX) score += 4;
    if (d.mimeType === MIME_PDF) score += 2;
    if (/consulta|carta|demanda|reclamo|extrajudicial|hecho/.test(name)) score += 3;
    if (/acuerdo|sentencia|poder|copia|formula|descargo/.test(name)) score -= 2;
    score += Math.min(3, Math.log10(Number(d.size || 1) + 1));
    return { d, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].d;
}

async function resolveWatchTarget(headers, driveUrl) {
  const parsed = parseDriveResourceFromUrl(driveUrl);
  if (!parsed) return null;

  let meta;
  try {
    meta = await getFileMeta(headers, parsed.id);
  } catch (err) {
    return { error: err.message, status: err.status, fileId: parsed.id };
  }

  if (meta.trashed) return { error: 'trashed', fileId: meta.id };

  const kind = classifyMime(meta.mimeType);
  if (kind === 'folder') {
    const children = await listFolderChildren(headers, meta.id);
    const primary = pickPrimaryDoc(children);
    if (!primary) return { error: 'folder_without_docs', fileId: meta.id, folderId: meta.id };
    return {
      fileId: primary.id,
      folderId: meta.id,
      name: primary.name,
      mimeType: primary.mimeType,
      md5Checksum: primary.md5Checksum || null,
      headRevisionId: primary.headRevisionId || null,
      modifiedTime: primary.modifiedTime || null,
      webViewLink: primary.webViewLink || null,
      fileType: classifyMime(primary.mimeType),
    };
  }

  if (!isWatchableMime(meta.mimeType)) {
    return { error: 'unsupported_mime', fileId: meta.id, mimeType: meta.mimeType };
  }

  return {
    fileId: meta.id,
    folderId: null,
    name: meta.name,
    mimeType: meta.mimeType,
    md5Checksum: meta.md5Checksum || null,
    headRevisionId: meta.headRevisionId || null,
    modifiedTime: meta.modifiedTime || null,
    webViewLink: meta.webViewLink || null,
    fileType: classifyMime(meta.mimeType),
  };
}

async function extractText(headers, target) {
  if (target.fileType === 'google_doc') {
    const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(target.fileId)}/export?mimeType=text/plain`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Export text ${res.status}`);
    return await res.text();
  }
  if (target.fileType === 'docx') {
    const buf = await driveBuffer(
      headers,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(target.fileId)}?alt=media&supportsAllDrives=true`
    );
    const result = await mammoth.extractRawText({ buffer: buf });
    return result.value || '';
  }
  if (target.fileType === 'pdf') {
    // MVP: no PDF text extraction library — empty text forces review via score
    return '';
  }
  return '';
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function resolveDriveUrl(reclamo) {
  const manual = reclamo.enlacesExternos?.drive;
  const legacy = reclamo.googleDrive;
  const url = trim(manual) || trim(legacy);
  return url && /^https?:\/\//i.test(url) ? url : null;
}

async function loadReclamosWithDrive(db) {
  const snap = await db.collection('reclamos').select('id', 'googleDrive', 'enlacesExternos', 'deletedAt').get();
  const items = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.deletedAt) continue;
    const driveUrl = resolveDriveUrl(data);
    if (!driveUrl) continue;
    items.push({
      reclamoId: Number(data.id ?? doc.id),
      driveUrl,
    });
  }
  return items;
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length || 1) }, () => worker()));
  return results;
}

async function upsertOpenAlert(db, payload) {
  // Evita índice compuesto: filtramos status en memoria.
  const existing = await db.collection(ALERTS).where('fileId', '==', payload.fileId).limit(10).get();
  const openDoc = existing.docs.find((doc) => {
    const status = doc.data().status;
    return status === 'open' || status === 'needs_review';
  });

  if (openDoc) {
    if (!dryRun) {
      await openDoc.ref.set(
        {
          lastActivityAt: payload.lastActivityAt,
          relevanceScore: Math.max(openDoc.data().relevanceScore || 0, payload.relevanceScore),
          matchedSignals: Array.from(
            new Set([...(openDoc.data().matchedSignals || []), ...payload.matchedSignals])
          ),
          diffStats: payload.diffStats,
          diffSnippet: payload.diffSnippet,
          fileName: payload.fileName,
          tier: payload.tier,
        },
        { merge: true }
      );
    }
    return { id: openDoc.id, created: false };
  }

  const ref = db.collection(ALERTS).doc();
  if (!dryRun) await ref.set(payload);
  return { id: ref.id, created: true };
}

async function saveSnapshot(db, snapDoc) {
  if (dryRun) return;
  await db.collection(SNAPSHOTS).doc(snapDoc.fileId).set(snapDoc, { merge: true });
}

async function bootstrapSnapshots(db, headers, reclamos) {
  console.log(`Bootstrap: ${reclamos.length} reclamos con Drive`);
  let ok = 0;
  let skipped = 0;
  let errors = 0;

  await mapPool(reclamos, CONCURRENCY, async (item, i) => {
    if ((i + 1) % 25 === 0 || i === 0) {
      console.log(`  [${i + 1}/${reclamos.length}]`);
    }
    try {
      const existing = await db.collection(SNAPSHOTS).where('reclamoId', '==', item.reclamoId).limit(1).get();
      // Also skip if file already snapshotted
      const target = await resolveWatchTarget(headers, item.driveUrl);
      if (target?.error) {
        skipped += 1;
        return;
      }
      if (!target?.fileId) {
        skipped += 1;
        return;
      }

      const already = await db.collection(SNAPSHOTS).doc(target.fileId).get();
      if (already.exists && !bootstrap) {
        skipped += 1;
        return;
      }
      // force refresh on --bootstrap even if exists? Yes overwrite text baseline
      if (already.exists && args.includes('--skip-existing')) {
        skipped += 1;
        return;
      }

      const rawText = await extractText(headers, target);
      const normalized = normalizeText(rawText).slice(0, MAX_TEXT_STORE);
      const now = new Date().toISOString();
      await saveSnapshot(db, {
        fileId: target.fileId,
        reclamoId: item.reclamoId,
        folderId: target.folderId,
        fileName: target.name,
        fileType: target.fileType,
        mimeType: target.mimeType,
        driveUrl: target.webViewLink || item.driveUrl,
        md5Checksum: target.md5Checksum,
        headRevisionId: target.headRevisionId,
        driveModifiedTime: target.modifiedTime,
        normalizedTextHash: sha256(normalized),
        normalizedText: normalized,
        textSnapshotDate: now,
        lastCheckedAt: now,
        lastChangedAt: null,
        lastDiffStats: null,
        inaccessible: false,
      });
      ok += 1;
      void existing;
    } catch (err) {
      errors += 1;
      console.warn(`  ! reclamo #${item.reclamoId}: ${err.message}`);
    }
  });

  console.log(`Bootstrap listo: ok=${ok} skip=${skipped} err=${errors}`);
}

async function pollSnapshots(db, headers) {
  let query = db.collection(SNAPSHOTS);
  const snap = await query.get();
  let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (limit != null && Number.isFinite(limit)) docs = docs.slice(0, limit);

  console.log(`Vigilando ${docs.length} snapshots`);

  let checked = 0;
  let contentChanged = 0;
  let alertsCreated = 0;
  let alertsUpdated = 0;
  let skipped = 0;
  let inaccessible = 0;

  await mapPool(docs, CONCURRENCY, async (snapshot, i) => {
    if ((i + 1) % 20 === 0 || i === 0) console.log(`  [${i + 1}/${docs.length}] ${snapshot.fileName || snapshot.fileId}`);
    checked += 1;
    const now = new Date().toISOString();

    let meta;
    try {
      meta = await getFileMeta(headers, snapshot.fileId);
    } catch (err) {
      inaccessible += 1;
      if (!dryRun) {
        await db.collection(SNAPSHOTS).doc(snapshot.fileId).set(
          {
            lastCheckedAt: now,
            inaccessible: true,
            inaccessibleError: err.message,
          },
          { merge: true }
        );
        await upsertOpenAlert(db, {
          reclamoId: snapshot.reclamoId,
          fileId: snapshot.fileId,
          fileName: snapshot.fileName || snapshot.fileId,
          status: 'open',
          tier: 'high',
          relevanceScore: 20,
          matchedSignals: ['error:inaccessible'],
          detectedAt: now,
          lastActivityAt: now,
          diffStats: null,
          diffSnippet: `No se pudo acceder al archivo: ${err.message}`,
          driveUrl: snapshot.driveUrl || null,
        });
        alertsCreated += 1;
      }
      return;
    }

    if (meta.trashed) {
      skipped += 1;
      return;
    }

    const revisionChanged =
      Boolean(meta.headRevisionId) && meta.headRevisionId !== snapshot.headRevisionId;
    const checksumChanged =
      Boolean(meta.md5Checksum) && meta.md5Checksum !== snapshot.md5Checksum;
    const modifiedTimeChanged =
      Boolean(meta.modifiedTime) &&
      meta.modifiedTime !== snapshot.driveModifiedTime;

    const mustExtract =
      !snapshot.normalizedTextHash ||
      revisionChanged ||
      checksumChanged ||
      (!snapshot.headRevisionId && !snapshot.md5Checksum && modifiedTimeChanged);

    if (!mustExtract) {
      if (!dryRun) {
        await db.collection(SNAPSHOTS).doc(snapshot.fileId).set(
          { lastCheckedAt: now, inaccessible: false },
          { merge: true }
        );
      }
      skipped += 1;
      return;
    }

    let rawText = null;
    let normalized = null;
    let textHash = null;

    try {
      rawText = await extractText(headers, {
        fileId: snapshot.fileId,
        fileType: snapshot.fileType || classifyMime(meta.mimeType),
      });
    } catch (err) {
      console.warn(`  ! extract ${snapshot.fileId}: ${err.message}`);
      skipped += 1;
      return;
    }

    normalized = normalizeText(rawText).slice(0, MAX_TEXT_STORE);
    textHash = sha256(normalized);

    if (textHash === snapshot.normalizedTextHash) {
      if (!dryRun) {
        await db.collection(SNAPSHOTS).doc(snapshot.fileId).set(
          {
            lastCheckedAt: now,
            md5Checksum: meta.md5Checksum || snapshot.md5Checksum || null,
            headRevisionId: meta.headRevisionId || snapshot.headRevisionId || null,
            inaccessible: false,
          },
          { merge: true }
        );
      }
      skipped += 1;
      return;
    }

    contentChanged += 1;
    const prevText = snapshot.normalizedText || '';
    const diff = diffParagraphs(prevText, normalized);
    const scoring = scoreChanges(diff, meta.name || snapshot.fileName || '');

    const snapUpdate = {
      fileName: meta.name || snapshot.fileName,
      mimeType: meta.mimeType,
      fileType: classifyMime(meta.mimeType),
      md5Checksum: meta.md5Checksum || null,
      headRevisionId: meta.headRevisionId || null,
      driveModifiedTime: meta.modifiedTime || null,
      normalizedTextHash: textHash,
      normalizedText: normalized,
      textSnapshotDate: now,
      lastCheckedAt: now,
      lastChangedAt: now,
      lastDiffStats: {
        percentChanged: diff.percentChanged,
        paragraphsAdded: diff.paragraphsAdded,
        paragraphsModified: diff.paragraphsModified,
        paragraphsRemoved: diff.paragraphsRemoved,
        charsDelta: normalized.length - prevText.length,
      },
      driveUrl: meta.webViewLink || snapshot.driveUrl || null,
      inaccessible: false,
    };

    await saveSnapshot(db, { fileId: snapshot.fileId, reclamoId: snapshot.reclamoId, ...snapUpdate });

    if (scoring.action === 'skip') {
      console.log(`    skip score=${scoring.score}`);
      return;
    }

    const tier = scoring.action === 'alert_high' ? 'high' : 'medium';
    const result = await upsertOpenAlert(db, {
      reclamoId: snapshot.reclamoId,
      fileId: snapshot.fileId,
      fileName: meta.name || snapshot.fileName || snapshot.fileId,
      status: 'open',
      tier,
      relevanceScore: scoring.score,
      matchedSignals: scoring.matched,
      detectedAt: now,
      lastActivityAt: now,
      diffStats: snapUpdate.lastDiffStats,
      diffSnippet: buildDiffSnippet(diff),
      driveUrl: meta.webViewLink || snapshot.driveUrl || null,
    });

    if (result.created) alertsCreated += 1;
    else alertsUpdated += 1;
    console.log(
      `    ALERT ${tier} score=${scoring.score} [${scoring.matched.join(', ')}] reclamo=#${snapshot.reclamoId}`
    );
  });

  const summary = {
    checked,
    contentChanged,
    alertsCreated,
    alertsUpdated,
    skipped,
    inaccessible,
    dryRun,
    finishedAt: new Date().toISOString(),
  };

  if (!dryRun) {
    await db.collection(META).doc('default').set(
      {
        lastPolledAt: summary.finishedAt,
        filesProcessed: checked,
        contentChanged,
        alertsCreated,
        alertsUpdated,
      },
      { merge: true }
    );
  }

  console.log('\n=== Resumen poll ===');
  console.log(summary);
  return summary;
}

async function main() {
  console.log(`Drive watch${dryRun ? ' (DRY RUN)' : ''}${bootstrap ? ' [bootstrap]' : ''}`);
  initFirebase();
  const db = admin.firestore();
  const headers = await getDriveHeaders();

  if (bootstrap) {
    let reclamos = await loadReclamosWithDrive(db);
    console.log(`Reclamos con link Drive: ${reclamos.length}`);
    if (limit != null && Number.isFinite(limit)) {
      reclamos = reclamos.slice(0, limit);
      console.log(`Limitado a ${reclamos.length}`);
    }
    await bootstrapSnapshots(db, headers, reclamos);
    return;
  }

  const countSnap = await db.collection(SNAPSHOTS).limit(1).get();
  if (countSnap.empty) {
    console.log('No hay snapshots. Corré primero: npm run drive:watch:bootstrap');
    return;
  }

  await pollSnapshots(db, headers);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
