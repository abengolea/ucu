#!/usr/bin/env node
/**
 * Importa casos históricos desde Google Drive → Firestore (reclamos).
 *
 * Uso:
 *   node scripts/import-reclamos-from-drive.mjs --dry-run
 *   node scripts/import-reclamos-from-drive.mjs --dry-run --limit=5
 *   node scripts/import-reclamos-from-drive.mjs --limit=20
 *   node scripts/import-reclamos-from-drive.mjs --folder=ID --resource-key=KEY
 *   node scripts/import-reclamos-from-drive.mjs --no-cache
 *
 * Optimización de costo Gemini (corridas grandes):
 *   - Prefiltro por título (no consumidor) sin IA
 *   - Dedupe previo (DNI en texto / nombre+empresa del título) antes de Gemini
 *   - 2 pasos: clasificar barato → extraer solo si es consumidor
 *   - Caps de input/output + PDF solo si no hay texto usable
 *   - Cache local en imports/drive-ai-cache.json (por archivo + fingerprint)
 *
 * Tras escribir cada reclamo, registra el snapshot de Drive (baseline del watcher)
 * para que el poll diario ya lo vigile sin un bootstrap aparte.
 *
 * Env:
 *   GOOGLE_APPLICATION_CREDENTIALS / Firebase Admin
 *   GEMINI_API_KEY
 *   GEMINI_MODEL (default: gemini-2.5-flash) — extracción
 *   GEMINI_MODEL_LITE (default: gemini-2.5-flash-lite) — clasificación
 *   DRIVE_FOLDER_ID (default: carpeta "casos propios")
 *   DRIVE_RESOURCE_KEY (opcional)
 *   DRIVE_YEARS (default: 3)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { GoogleAuth } from 'google-auth-library';
import mammoth from 'mammoth';
import { buildSnapshotRecord, writeDriveSnapshot } from './lib/drive-watch-snapshots.mjs';
import { isWatchableMime } from './lib/drive-watch-shared.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env.local') });

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipAi = args.includes('--skip-ai');
const noCache = args.includes('--no-cache');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : null;
const yearsArg = args.find((a) => a.startsWith('--years='));
const years = yearsArg
  ? Number(yearsArg.split('=')[1])
  : Number(process.env.DRIVE_YEARS || 3);
const folderArg = args.find((a) => a.startsWith('--folder='));
const resourceKeyArg = args.find((a) => a.startsWith('--resource-key='));

const FOLDER_ID =
  folderArg?.slice('--folder='.length) ||
  process.env.DRIVE_FOLDER_ID ||
  '0B5cTXg75kgNWRHZ4U3dIRUJJdWc';
const RESOURCE_KEY =
  resourceKeyArg?.slice('--resource-key='.length) ||
  process.env.DRIVE_RESOURCE_KEY ||
  '0-GiA0pzjnF-MS3ptnte5nRw';

const RESPONSABLE = {
  email: (process.env.ADMIN_PANEL_EMAIL || 'abengolea1@gmail.com').trim().toLowerCase(),
  name: 'Adrian Bengolea',
};

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
const GEMINI_MODEL_LITE =
  process.env.GEMINI_MODEL_LITE?.trim() || 'gemini-2.5-flash-lite';
const SYNC_SOURCE = 'google_drive_ai_import';
const LEGACY_PREFIX = 'drive:';
const AI_CACHE_PATH = path.join(rootDir, 'imports', 'drive-ai-cache.json');

const MIME_GOOGLE_DOC = 'application/vnd.google-apps.document';
const MIME_GOOGLE_FOLDER = 'application/vnd.google-apps.folder';
const MIME_DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MIME_DOC = 'application/msword';
const MIME_PDF = 'application/pdf';

const DOC_MIMES = new Set([MIME_GOOGLE_DOC, MIME_DOCX, MIME_DOC, MIME_PDF]);

/** Caps de costo: menos input + menos output + PDF solo si hace falta. */
const MAX_TEXT_CHARS = 12_000;
const MAX_RESUMEN_CHARS = 220;
const MAX_HECHO_CHARS = 800;
const MIN_TEXT_FOR_SKIP_PDF = 200;
const CLASSIFY_TEXT_CHARS = 4_000;
const GEMINI_CONCURRENCY = 2;

function trim(value) {
  return String(value ?? '').trim();
}

function stripUndefined(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function normalizeSearch(value) {
  return trim(value)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function collapseAlnum(value) {
  return normalizeSearch(value).replace(/[^a-z0-9]/g, '');
}

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
    throw new Error('Faltan credenciales Firebase Admin en .env.local');
  }
  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

async function getDriveClient() {
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
  if (!tokenRes.token) throw new Error('No se obtuvo access token de Drive');
  return {
    token: tokenRes.token,
    headers: {
      Authorization: `Bearer ${tokenRes.token}`,
      ...(RESOURCE_KEY
        ? { 'X-Goog-Drive-Resource-Keys': `${FOLDER_ID}/${RESOURCE_KEY}` }
        : {}),
    },
  };
}

async function driveFetch(headers, url) {
  const res = await fetch(url, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Drive HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

async function listChildren(headers, parentId) {
  const files = [];
  let pageToken = null;
  do {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', `'${parentId}' in parents and trashed=false`);
    url.searchParams.set(
      'fields',
      'nextPageToken,files(id,name,mimeType,createdTime,modifiedTime,webViewLink,size,resourceKey,parents)'
    );
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('supportsAllDrives', 'true');
    url.searchParams.set('includeItemsFromAllDrives', 'true');
    url.searchParams.set('orderBy', 'folder,name');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const data = await driveFetch(headers, url.toString());
    files.push(...(data.files || []));
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return files;
}

async function walkDrive(headers, rootId) {
  const folders = [];
  const docs = [];

  async function walk(folderId, folderPath, folderCreated) {
    const children = await listChildren(headers, folderId);
    for (const child of children) {
      const childPath = folderPath ? `${folderPath}/${child.name}` : child.name;
      if (child.mimeType === MIME_GOOGLE_FOLDER) {
        folders.push({
          id: child.id,
          name: child.name,
          path: childPath,
          createdTime: child.createdTime,
          webViewLink: child.webViewLink,
        });
        await walk(child.id, childPath, child.createdTime);
      } else if (DOC_MIMES.has(child.mimeType)) {
        docs.push({
          id: child.id,
          name: child.name,
          path: childPath,
          mimeType: child.mimeType,
          createdTime: child.createdTime,
          modifiedTime: child.modifiedTime,
          webViewLink: child.webViewLink,
          size: Number(child.size || 0),
          parentId: folderId,
          parentPath: folderPath,
          parentCreatedTime: folderCreated,
        });
      }
    }
  }

  await walk(rootId, '', null);
  return { folders, docs };
}

function cutoffIso(yearsBack) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - yearsBack);
  return d.toISOString();
}

/**
 * Una unidad de caso = carpeta con docs, o documento suelto en la raíz.
 */
function buildCaseUnits(folders, docs, cutoff) {
  const docsByParent = new Map();
  for (const doc of docs) {
    const list = docsByParent.get(doc.parentId) || [];
    list.push(doc);
    docsByParent.set(doc.parentId, list);
  }

  const units = [];

  for (const folder of folders) {
    const folderDocs = docsByParent.get(folder.id) || [];
    if (!folderDocs.length) continue;
    const newest = folderDocs
      .map((d) => d.createdTime)
      .concat([folder.createdTime])
      .filter(Boolean)
      .sort()
      .at(-1);
    const createdTime = folder.createdTime || newest;
    if (createdTime < cutoff) continue;

    const primary = pickPrimaryDoc(folderDocs);
    units.push({
      kind: 'folder',
      key: folder.id,
      title: folder.name,
      path: folder.path,
      createdTime,
      driveUrl: folder.webViewLink || primary?.webViewLink || null,
      docs: folderDocs,
      primary,
    });
  }

  const rootDocs = (docsByParent.get(FOLDER_ID) || []).filter(
    (d) => d.createdTime >= cutoff
  );
  for (const doc of rootDocs) {
    units.push({
      kind: 'file',
      key: doc.id,
      title: doc.name.replace(/\.(docx?|pdf)$/i, ''),
      path: doc.path,
      createdTime: doc.createdTime,
      driveUrl: doc.webViewLink || null,
      docs: [doc],
      primary: doc,
    });
  }

  units.sort((a, b) => a.createdTime.localeCompare(b.createdTime));
  return units;
}

function pickPrimaryDoc(docs) {
  const scored = [...docs].map((d) => {
    let score = 0;
    const name = d.name.toLowerCase();
    if (d.mimeType === MIME_GOOGLE_DOC) score += 5;
    if (d.mimeType === MIME_DOCX) score += 4;
    if (d.mimeType === MIME_PDF) score += 2;
    if (/consulta|carta|demanda|reclamo|extrajudicial|hecho/.test(name)) score += 3;
    if (/acuerdo|sentencia|poder|copia|formula|descargo/.test(name)) score -= 2;
    score += Math.min(3, Math.log10((d.size || 1) + 1));
    return { d, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.d || docs[0];
}

async function downloadBinary(headers, fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Download ${fileId}: ${res.status} ${text.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function exportGoogleDocText(headers, fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Export ${fileId}: ${res.status} ${text.slice(0, 200)}`);
  }
  return await res.text();
}

async function extractDocText(headers, doc) {
  if (doc.mimeType === MIME_GOOGLE_DOC) {
    return exportGoogleDocText(headers, doc.id);
  }
  if (doc.mimeType === MIME_DOCX) {
    const buf = await downloadBinary(headers, doc.id);
    const result = await mammoth.extractRawText({ buffer: buf });
    return result.value || '';
  }
  if (doc.mimeType === MIME_PDF) {
    // Gemini puede leer PDF; devolvemos marker especial
    return { __pdfBase64: (await downloadBinary(headers, doc.id)).toString('base64') };
  }
  if (doc.mimeType === MIME_DOC) {
    // .doc viejo: no parseamos; solo nombre como hint
    return `[Archivo .doc sin extracción de texto: ${doc.name}]`;
  }
  return '';
}

async function gatherCaseText(headers, unit) {
  const parts = [];
  const pdfParts = [];
  let primaryRawText = '';
  const docsToRead = unit.primary
    ? [unit.primary, ...unit.docs.filter((d) => d.id !== unit.primary.id)].slice(0, 3)
    : unit.docs.slice(0, 3);

  for (const doc of docsToRead) {
    try {
      const extracted = await extractDocText(headers, doc);
      if (extracted && typeof extracted === 'object' && extracted.__pdfBase64) {
        pdfParts.push({ name: doc.name, data: extracted.__pdfBase64 });
        if (unit.primary && doc.id === unit.primary.id) primaryRawText = '';
      } else {
        const text = trim(extracted);
        if (unit.primary && doc.id === unit.primary.id) primaryRawText = text;
        if (text) parts.push(`--- Archivo: ${doc.name} ---\n${text}`);
      }
    } catch (err) {
      parts.push(`--- Archivo: ${doc.name} (error lectura: ${err.message}) ---`);
    }
  }

  let text = parts.join('\n\n').slice(0, MAX_TEXT_CHARS);
  return { text, pdfParts, primaryRawText, primaryDoc: unit.primary || null };
}

async function getDriveFileMeta(headers, fileId) {
  const fields =
    'id,name,mimeType,md5Checksum,headRevisionId,modifiedTime,webViewLink,size,trashed';
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=${fields}&supportsAllDrives=true`;
  const res = await fetch(url, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Drive meta HTTP ${res.status}`);
  }
  return data;
}

async function createSnapshotsForImportedCases(db, headers, prepared, docsToWrite) {
  let ok = 0;
  let skipped = 0;
  let errors = 0;

  console.log(`Registrando snapshots Drive para ${docsToWrite.length} casos nuevos…`);

  for (let i = 0; i < docsToWrite.length; i++) {
    const reclamo = docsToWrite[i];
    const item = prepared[i];
    const primary = item.primaryDoc || item.unit?.primary;
    if (!primary?.id || !isWatchableMime(primary.mimeType)) {
      skipped += 1;
      continue;
    }

    try {
      let meta = {
        id: primary.id,
        name: primary.name,
        mimeType: primary.mimeType,
        md5Checksum: primary.md5Checksum || null,
        headRevisionId: primary.headRevisionId || null,
        modifiedTime: primary.createdTime || primary.modifiedTime || null,
        webViewLink: primary.webViewLink || reclamo.googleDrive || null,
      };
      try {
        meta = await getDriveFileMeta(headers, primary.id);
      } catch {
        // usamos metadata del listado si files.get falla
      }

      if (meta.trashed) {
        skipped += 1;
        continue;
      }

      const folderId = item.unit?.kind === 'folder' ? item.unit.key : null;
      const record = buildSnapshotRecord({
        reclamoId: reclamo.id,
        fileId: meta.id,
        folderId,
        fileName: meta.name || primary.name,
        mimeType: meta.mimeType || primary.mimeType,
        md5Checksum: meta.md5Checksum || null,
        headRevisionId: meta.headRevisionId || null,
        driveModifiedTime: meta.modifiedTime || null,
        driveUrl: meta.webViewLink || reclamo.googleDrive || null,
        rawText: item.primaryRawText || '',
        source: 'drive_import',
      });

      await writeDriveSnapshot(db, record, { dryRun });
      ok += 1;
    } catch (err) {
      errors += 1;
      console.warn(`  ! snapshot reclamo #${reclamo.id}: ${err.message}`);
    }
  }

  console.log(`Snapshots: ok=${ok} skip=${skipped} err=${errors}`);
  return { ok, skipped, errors };
}

function unitFingerprint(unit) {
  const primary = unit.primary || {};
  return [
    primary.id || unit.key,
    primary.modifiedTime || unit.createdTime || '',
    primary.md5Checksum || '',
    unit.title || '',
  ].join('|');
}

function loadAiCache() {
  if (noCache) return { version: 2, entries: {} };
  try {
    if (!fs.existsSync(AI_CACHE_PATH)) return { version: 2, entries: {} };
    const parsed = JSON.parse(fs.readFileSync(AI_CACHE_PATH, 'utf8'));
    if (!parsed?.entries || typeof parsed.entries !== 'object') {
      return { version: 2, entries: {} };
    }
    return { version: 2, entries: parsed.entries };
  } catch {
    return { version: 2, entries: {} };
  }
}

function saveAiCache(cache) {
  if (noCache) return;
  fs.mkdirSync(path.dirname(AI_CACHE_PATH), { recursive: true });
  fs.writeFileSync(AI_CACHE_PATH, JSON.stringify(cache, null, 2));
}

function cacheGet(cache, key, fingerprint, kind) {
  const entry = cache.entries[key];
  if (!entry || entry.fingerprint !== fingerprint) return null;
  return entry[kind] ?? null;
}

function cacheSet(cache, key, fingerprint, kind, value) {
  const prev = cache.entries[key];
  if (!prev || prev.fingerprint !== fingerprint) {
    cache.entries[key] = { fingerprint, savedAt: new Date().toISOString() };
  }
  cache.entries[key][kind] = value;
  cache.entries[key].savedAt = new Date().toISOString();
}

function parseEmpresaFromTitle(title) {
  const cleaned = String(title || '')
    .replace(/^\([^)]*\)\s*/g, '')
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .trim();
  const parts = cleaned.split(/\s+c\/?\.?\s+/i);
  if (parts.length < 2) return null;
  const right = parts
    .slice(1)
    .join(' c ')
    .replace(/\s*s\/.*$/i, '')
    .replace(/\s*-\s*.*$/, '')
    .trim();
  return right || null;
}

function guessNonConsumerFromTitle(title) {
  const t = String(title || '');
  const consumerHint =
    /consumidor|usuario|tarjeta|banco|obra\s*social|prepaga|telecom|personal|claro|movistar|garant[ií]a|plan\s+de\s+ahorro|veraz|bcra|d[eé]bito|seguro|cable|internet|celular|inmobiliaria|constructora|automotor|ahorro\s+para|osde|swiss|galicia|bbva|naranja|visa|mastercard/i.test(
      t
    );
  if (consumerHint) return { exclude: false, reason: null };

  const nonConsumer =
    /laboral|despido|indemnizaci[oó]n\s+laboral|\bart\b|\blct\b|divorcio|alimentos|tenencia|r[eé]gimen\s+de\s+visita|familia|sucesi[oó]n|penal|homicidio|abuso|desalojo(?!\s+comercial)|accidente\s+de\s+trabajo|juicios?\s+laborales?/i.test(
      t
    );
  if (nonConsumer) {
    return { exclude: true, reason: 'título sugiere no-consumidor' };
  }
  return { exclude: false, reason: null };
}

/** Títulos tipo "Apellido c. Empresa" → ir directo a extracción (sin clasificar). */
function looksLikeConsumerTitle(title) {
  if (guessNonConsumerFromTitle(title).exclude) return false;
  return /\s+c\/?\.?\s+/i.test(String(title || ''));
}

function extractDniFromText(text) {
  const raw = String(text || '');
  const labeled = raw.match(
    /(?:d\.?\s*n\.?\s*i\.?|documento(?:\s+nacional)?(?:\s+de\s+identidad)?|nro\.?\s*doc(?:umento)?|n[uú]mero\s+de\s+documento)\s*[:=]?\s*([\d.]{7,11})/i
  );
  if (labeled?.[1]) {
    const digits = labeled[1].replace(/\D/g, '');
    if (digits.length >= 7 && digits.length <= 8 && !/^0+$/.test(digits)) return digits;
  }
  const dotted = raw.match(/\b(\d{1,2}\.\d{3}\.\d{3})\b/);
  if (dotted?.[1]) {
    const digits = dotted[1].replace(/\D/g, '');
    if (digits.length >= 7 && digits.length <= 8) return digits;
  }
  return null;
}

function prepareAiPayload(gathered, { forClassify = false } = {}) {
  const max = forClassify ? CLASSIFY_TEXT_CHARS : MAX_TEXT_CHARS;
  const text = trim(gathered?.text || '').slice(0, max);
  const hasUsableText = text.replace(/\s+/g, ' ').trim().length >= MIN_TEXT_FOR_SKIP_PDF;
  const pdfBase64 = hasUsableText ? null : gathered?.pdfParts?.[0]?.data || null;
  return { text, pdfBase64, hasUsableText };
}

async function callGemini({ system, userText, pdfBase64, model }) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('Falta GEMINI_API_KEY en .env.local');

  const modelId = model || GEMINI_MODEL;
  const parts = [];
  if (pdfBase64) {
    parts.push({ inlineData: { mimeType: 'application/pdf', data: pdfBase64 } });
  }
  parts.push({ text: userText });

  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      maxOutputTokens: modelId.includes('lite') ? 512 : 2048,
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gemini HTTP ${res.status} (${modelId})`);
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error(`Gemini no devolvió texto (${modelId})`);
  return JSON.parse(text);
}

async function callGeminiWithFallback(opts) {
  try {
    return await callGemini(opts);
  } catch (err) {
    if (opts.model && opts.model !== GEMINI_MODEL) {
      console.warn(`  ! ${opts.model} falló (${err.message}); reintento con ${GEMINI_MODEL}`);
      return callGemini({ ...opts, model: GEMINI_MODEL });
    }
    throw err;
  }
}

async function classifyWithAi(unit, gathered) {
  const { text, pdfBase64 } = prepareAiPayload(gathered, { forClassify: true });
  const system = `Sos un clasificador de Usuarios y Consumidores Unidos (UCU), Argentina.
Decidí si el documento es un reclamo de consumidor/usuario vs empresa.
true: defensa del consumidor, usuario de servicios, tarjeta, banco, prepaga, garantía, plan de ahorro, etc.
false: laboral, penal, familia, sucesión, desalojo habitacional propio, accidente laboral, etc.
Respondé SOLO JSON: { "esReclamoConsumidor": true|false, "motivo": "frase corta", "confianza": 0.0 }`;

  const userText = `Título: ${unit.title}
Ruta: ${unit.path}

Texto (recorte):
${text || '(sin texto; usá título y/o PDF)'}
`;

  return callGeminiWithFallback({
    system,
    userText,
    pdfBase64,
    model: GEMINI_MODEL_LITE,
  });
}

async function extractWithAi(unit, gathered) {
  const { text, pdfBase64 } = prepareAiPayload(gathered);
  const system = `Sos un asistente de Usuarios y Consumidores Unidos (UCU), Argentina.
Extraés datos de expedientes/escritos legales (consultas, cartas documento, demandas) para cargar un reclamo histórico.
Reglas:
- Solo datos que figuren en el documento o en el título de carpeta/archivo. NO inventes DNI, emails, teléfonos ni empresas.
- Si un campo no está, usá null o "".
- empresas: lista de razones sociales denunciadas/demandadas (no el consumidor).
- El consumidor/denunciante es la persona física que reclama (actor/cliente), no la empresa.
- resumen: máximo ${MAX_RESUMEN_CHARS} caracteres, en español, claro.
- hecho: narrativa breve de los hechos (máximo ${MAX_HECHO_CHARS} caracteres). Sé conciso.
- esReclamoConsumidor: true (este caso ya fue pre-filtrado como consumidor).
Respondé SOLO JSON válido. No alargues campos de más.`;

  const userText = `Título del caso (carpeta/archivo): ${unit.title}
Ruta Drive: ${unit.path}
Fecha archivo Drive: ${unit.createdTime}

Texto extraído:
${text || '(sin texto; usá título y/o PDF adjunto)'}

JSON:
{
  "esReclamoConsumidor": true,
  "denunciante": {
    "nombre": "",
    "apellido": "",
    "tipoDocumento": "DNI",
    "numeroDocumento": "",
    "email": "",
    "telefono": "",
    "calle": "",
    "numero": "",
    "provincia": "",
    "ciudad": ""
  },
  "empresas": ["razón social"],
  "resumen": "",
  "hecho": "",
  "numeroExpediente": null,
  "notas": [],
  "confianza": 0.0
}`;

  const raw = await callGemini({ system, userText, pdfBase64, model: GEMINI_MODEL });
  if (raw?.resumen) raw.resumen = String(raw.resumen).slice(0, MAX_RESUMEN_CHARS);
  if (raw?.hecho) raw.hecho = String(raw.hecho).slice(0, MAX_HECHO_CHARS);
  raw.esReclamoConsumidor = true;
  return raw;
}

async function classifyCached(cache, unit, gathered, stats) {
  const fp = unitFingerprint(unit);
  const hit = cacheGet(cache, unit.key, fp, 'classify');
  if (hit) {
    stats.cacheHitsClassify += 1;
    return hit;
  }
  const result = await classifyWithAi(unit, gathered);
  cacheSet(cache, unit.key, fp, 'classify', result);
  stats.apiClassify += 1;
  return result;
}

async function extractCached(cache, unit, gathered, stats) {
  const fp = unitFingerprint(unit);
  const hit = cacheGet(cache, unit.key, fp, 'extract');
  if (hit) {
    stats.cacheHitsExtract += 1;
    return hit;
  }
  const result = await extractWithAi(unit, gathered);
  cacheSet(cache, unit.key, fp, 'extract', result);
  stats.apiExtract += 1;
  return result;
}

function findDuplicatePreAi(unit, text, existingDocs, empresasCatalog) {
  const dni = extractDniFromText(`${unit.title}\n${text || ''}`);
  const fromTitle = guessNameFromTitle(unit.title);
  const name = personKey(fromTitle.nombre, fromTitle.apellido);
  const empresaHint = parseEmpresaFromTitle(unit.title);
  const pseudoMatched = [];
  const pseudoOtras = [];
  if (empresaHint && empresasCatalog?.length) {
    const { matched, otras } = matchEmpresas([empresaHint], empresasCatalog);
    pseudoMatched.push(...matched);
    pseudoOtras.push(...otras);
  } else if (empresaHint) {
    pseudoOtras.push(empresaHint);
  }
  const candidateEmpresas = new Set([
    ...pseudoMatched.map((empresa) => `id:${empresa.id}`),
    ...pseudoMatched.map((empresa) => `n:${collapseAlnum(empresa.nombre)}`),
    ...pseudoOtras.map((nombre) => `n:${collapseAlnum(nombre)}`),
  ]);

  for (const existing of existingDocs) {
    const existingDni = realDocumentNumber(
      existing.documentoSearch || existing.denunciante?.numeroDocumento
    );
    if (dni && existingDni === dni) {
      return { id: existing.id || existing.firestoreId, reason: `mismo DNI ${dni} (pre-IA)` };
    }

    const existingName = personKey(
      existing.denunciante?.nombre,
      existing.denunciante?.apellido
    );
    if (!name || name !== existingName) continue;

    if (candidateEmpresas.size && hasSharedEmpresa(candidateEmpresas, existing)) {
      return {
        id: existing.id || existing.firestoreId,
        reason: 'mismo consumidor y empresa (pre-IA, título)',
      };
    }

    const existingText = `${existing.resumen || ''} ${existing.hecho || ''}`;
    if (tokenSimilarity(unit.title, existingText) >= 0.55) {
      return {
        id: existing.id || existing.firestoreId,
        reason: 'mismo consumidor y título similar (pre-IA)',
      };
    }
  }
  return null;
}

function scoreEmpresaMatch(query, empresa) {
  const q = normalizeSearch(query);
  const qc = collapseAlnum(q);
  if (!q || !qc || qc.length < 3) return 0;
  const name = normalizeSearch(empresa.nombreSearch || empresa.nombre || '');
  const nc = collapseAlnum(name);
  if (!nc) return 0;
  if (nc === qc) return 100;

  // Evitar falsos positivos tipo "CA" / "VI" / "PLA" dentro de nombres largos
  const shorter = qc.length <= nc.length ? qc : nc;
  const longer = qc.length <= nc.length ? nc : qc;
  if (shorter.length >= 5 && longer.includes(shorter)) {
    return 80 + Math.min(15, shorter.length);
  }

  // token overlap (tokens significativos)
  const stop = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'sa', 'srl', 'sau', 'sociedad']);
  const qt = [...new Set(q.split(' ').filter((t) => t.length > 2 && !stop.has(t)))];
  const nt = new Set(name.split(' ').filter((t) => t.length > 2 && !stop.has(t)));
  if (!qt.length || !nt.size) return 0;
  let hit = 0;
  for (const t of qt) if (nt.has(t)) hit += 1;
  const ratio = hit / qt.length;
  if (ratio < 0.6) return 0;
  return Math.round(ratio * 70);
}

function matchEmpresas(nombres, catalog) {
  const matched = [];
  const otras = [];
  for (const raw of nombres || []) {
    const nombre = trim(raw);
    if (!nombre) continue;
    let best = null;
    let bestScore = 0;
    for (const emp of catalog) {
      const score = scoreEmpresaMatch(nombre, emp);
      if (score > bestScore) {
        bestScore = score;
        best = emp;
      }
    }
    if (best && bestScore >= 75) {
      if (!matched.some((m) => m.id === best.id)) {
        matched.push({ id: best.id, nombre: best.nombre, cuit: best.cuit ?? null });
      }
    } else {
      otras.push(nombre);
    }
  }
  return { matched, otras };
}

function splitNombreCompleto(nombre, apellido) {
  let n = trim(nombre);
  let a = trim(apellido);
  if (!a && n.includes(' ')) {
    const parts = n.split(/\s+/);
    if (parts.length >= 2) {
      n = parts[0];
      a = parts.slice(1).join(' ');
    }
  }
  return { nombre: n, apellido: a };
}

function guessNameFromTitle(title) {
  // "APELLIDO, NOMBRE c/ EMPRESA" o "Nombre c Empresa"
  const cleaned = title
    .replace(/^\([^)]*\)\s*/g, '')
    .replace(/\s*s\/.*$/i, '')
    .replace(/\s*\(EXTRAJUDICIAL.*$/i, '')
    .trim();
  const vs = cleaned.split(/\s+c\/?\.?\s+/i);
  if (vs.length >= 2) {
    const left = vs[0].trim();
    if (left.includes(',')) {
      const [ap, no] = left.split(',').map((s) => s.trim());
      return { nombre: no || 'Histórico', apellido: ap || 'Drive' };
    }
    const parts = left.split(/\s+/);
    if (parts.length >= 2) {
      return { nombre: parts[0], apellido: parts.slice(1).join(' ') };
    }
    return { nombre: left || 'Histórico', apellido: 'Drive' };
  }
  return { nombre: 'Histórico', apellido: 'Drive' };
}

function buildReclamoDoc({ id, unit, extracted, empresasMatched, otrasEmpresas, estados }) {
  const createdAt = unit.createdTime || new Date().toISOString();
  const d = extracted?.denunciante || {};
  const fromTitle = guessNameFromTitle(unit.title);
  const split = splitNombreCompleto(d.nombre || fromTitle.nombre, d.apellido || fromTitle.apellido);

  const nombre = split.nombre || 'Histórico';
  const apellido = split.apellido || 'Drive';
  const numeroDocumento = trim(d.numeroDocumento).replace(/\D/g, '') || '00000000';
  const email = trim(d.email).toLowerCase() || `drive-import+${unit.key.slice(0, 12)}@ucu.local`;
  const telefono = trim(d.telefono).replace(/\D/g, '') || '0000000000';

  // Estado: preferir un archivado si existe; si no, Consulta (1)
  let idCasoEstado = 1;
  let estadoDescripcion = 'Consulta';
  let idGrupoEstado = 1;
  const archivado = [...estados.values()].find((e) => e.idGrupoEstado === 3);
  if (archivado) {
    idCasoEstado = archivado.id;
    estadoDescripcion = archivado.descripcion;
    idGrupoEstado = 3;
  } else {
    const consulta = estados.get(1);
    if (consulta) {
      estadoDescripcion = consulta.descripcion;
      idGrupoEstado = consulta.idGrupoEstado;
    }
  }

  const resumen =
    trim(extracted?.resumen) ||
    `Caso histórico importado desde Drive: ${unit.title}`.slice(0, MAX_RESUMEN_CHARS);
  const hecho = (
    trim(extracted?.hecho) ||
    `Importado desde Google Drive (${unit.path}). Texto no disponible o incompleto.`
  ).slice(0, MAX_HECHO_CHARS);

  const doc = {
    id,
    legacyGuid: `${LEGACY_PREFIX}${unit.key}`,
    denunciante: {
      nombre,
      apellido,
      tipoDocumento: trim(d.tipoDocumento) || 'DNI',
      numeroDocumento,
      calle: trim(d.calle) || undefined,
      numero: trim(d.numero) || undefined,
      provinciaId: 0,
      ciudadId: 0,
      provinciaNombre: trim(d.provincia) || undefined,
      ciudadNombre: trim(d.ciudad) || undefined,
      telefono,
      email,
    },
    resumen,
    hecho,
    otrasEmpresas: otrasEmpresas.length ? otrasEmpresas.join('; ') : undefined,
    empresaIds: empresasMatched.map((e) => e.id),
    empresas: empresasMatched,
    idCasoEstado,
    estadoDescripcion,
    idGrupoEstado,
    adminBandeja: idGrupoEstado === 3 ? 'archivados' : 'gestion',
    responsable: {
      email: RESPONSABLE.email,
      name: RESPONSABLE.name,
      assignedAt: createdAt,
    },
    historialEstados: [
      {
        idCasoEstado,
        estadoDescripcion,
        idGrupoEstado,
        changedAt: createdAt,
        changedByEmail: RESPONSABLE.email,
        changedByName: RESPONSABLE.name,
        nota: `Importado desde Google Drive (${SYNC_SOURCE})`,
      },
    ],
    comentarios: [
      {
        id: `drive-import-${unit.key}`,
        texto: `Origen Drive: ${unit.path}\nURL: ${unit.driveUrl || '—'}\nConfianza IA: ${extracted?.confianza ?? 'n/a'}\nesReclamoConsumidor: ${extracted?.esReclamoConsumidor ?? 'n/a'}${(extracted?.notas || []).length ? `\nNotas: ${(extracted.notas || []).join('; ')}` : ''}`,
        esInterno: true,
        createdAt: new Date().toISOString(),
        authorEmail: RESPONSABLE.email,
        authorName: RESPONSABLE.name,
      },
    ],
    enlacesExternos: unit.driveUrl ? { drive: unit.driveUrl } : undefined,
    googleDrive: unit.driveUrl || undefined,
    numeroExpediente: trim(extracted?.numeroExpediente) || undefined,
    idTipo: 1,
    esExterno: true,
    documentoSearch: numeroDocumento.replace(/\D/g, ''),
    nombreSearch: `${nombre} ${apellido}`.trim().toLowerCase(),
    createdAt,
    updatedAt: createdAt,
    syncedAt: new Date().toISOString(),
    syncSource: SYNC_SOURCE,
  };

  return stripUndefined(doc);
}

async function loadExistingDriveKeys(db) {
  const keys = new Set();
  // Query by syncSource when possible; fallback scan limited meta
  const snap = await db
    .collection('reclamos')
    .where('syncSource', '==', SYNC_SOURCE)
    .select('legacyGuid')
    .get();
  for (const doc of snap.docs) {
    const guid = doc.data().legacyGuid;
    if (guid?.startsWith(LEGACY_PREFIX)) keys.add(guid.slice(LEGACY_PREFIX.length));
  }
  return keys;
}

async function loadExistingReclamos(db) {
  const snap = await db
    .collection('reclamos')
    .select(
      'id',
      'denunciante',
      'documentoSearch',
      'nombreSearch',
      'empresaIds',
      'empresas',
      'otrasEmpresas',
      'resumen',
      'hecho',
      'numeroExpediente',
      'deletedAt'
    )
    .get();
  return snap.docs
    .map((doc) => ({ firestoreId: doc.id, ...doc.data() }))
    .filter((doc) => !doc.deletedAt);
}

function realDocumentNumber(value) {
  const digits = trim(value).replace(/\D/g, '');
  return digits.length >= 7 && !/^0+$/.test(digits) ? digits : null;
}

function personKey(nombre, apellido) {
  const tokens = normalizeSearch(`${nombre || ''} ${apellido || ''}`)
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(
      (token) =>
        token.length > 1 &&
        !['historico', 'drive', 'sin', 'datos', 'desconocido'].includes(token)
    );
  return [...new Set(tokens)].sort().join(' ');
}

function textTokens(value) {
  const stop = new Set([
    'para', 'como', 'desde', 'contra', 'sobre', 'esta', 'este', 'entre',
    'reclamo', 'caso', 'historico', 'importado', 'drive', 'carta', 'documento',
  ]);
  return new Set(
    normalizeSearch(value)
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 3 && !stop.has(token))
  );
}

function tokenSimilarity(a, b) {
  const left = textTokens(a);
  const right = textTokens(b);
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  return intersection / Math.min(left.size, right.size);
}

function empresaKeysFromCandidate(item) {
  return new Set([
    ...item.matched.map((empresa) => `id:${empresa.id}`),
    ...item.matched.map((empresa) => `n:${collapseAlnum(empresa.nombre)}`),
    ...item.otras.map((nombre) => `n:${collapseAlnum(nombre)}`),
  ]);
}

function empresaKeysFromExisting(doc) {
  return new Set([
    ...(doc.empresaIds || []).map((id) => `id:${id}`),
    ...(doc.empresas || []).map((empresa) => `n:${collapseAlnum(empresa.nombre)}`),
    ...trim(doc.otrasEmpresas)
      .split(';')
      .map((nombre) => nombre.trim())
      .filter(Boolean)
      .map((nombre) => `n:${collapseAlnum(nombre)}`),
  ]);
}

function hasSharedEmpresa(candidateKeys, existing) {
  const existingKeys = empresaKeysFromExisting(existing);
  for (const key of candidateKeys) {
    if (existingKeys.has(key)) return true;
  }
  return false;
}

function findDuplicate(item, existingDocs) {
  const d = item.extracted?.denunciante || {};
  const dni = realDocumentNumber(d.numeroDocumento);
  const name = personKey(d.nombre, d.apellido);
  const expediente = collapseAlnum(item.extracted?.numeroExpediente || '');
  const candidateEmpresas = empresaKeysFromCandidate(item);
  const candidateText = `${item.unit.title} ${item.extracted?.resumen || ''} ${item.extracted?.hecho || ''}`;

  for (const existing of existingDocs) {
    const existingDni = realDocumentNumber(
      existing.documentoSearch || existing.denunciante?.numeroDocumento
    );
    if (dni && existingDni === dni) {
      return { id: existing.id || existing.firestoreId, reason: `mismo DNI ${dni}` };
    }

    const existingExpediente = collapseAlnum(existing.numeroExpediente || '');
    if (expediente.length >= 5 && existingExpediente === expediente) {
      return {
        id: existing.id || existing.firestoreId,
        reason: `mismo expediente ${item.extracted.numeroExpediente}`,
      };
    }

    const existingName = personKey(
      existing.denunciante?.nombre,
      existing.denunciante?.apellido
    );
    if (!name || name !== existingName) continue;

    if (hasSharedEmpresa(candidateEmpresas, existing)) {
      return {
        id: existing.id || existing.firestoreId,
        reason: 'mismo consumidor y empresa',
      };
    }

    const existingText = `${existing.resumen || ''} ${existing.hecho || ''}`;
    if (tokenSimilarity(candidateText, existingText) >= 0.45) {
      return {
        id: existing.id || existing.firestoreId,
        reason: 'mismo consumidor y hechos similares',
      };
    }
  }
  return null;
}

async function loadEmpresas(db) {
  const snap = await db.collection('reclamos_empresas').get();
  return snap.docs.map((d) => d.data());
}

async function loadEstados(db) {
  const snap = await db.collection('reclamos_estados').get();
  return new Map(snap.docs.map((d) => [d.data().id, d.data()]));
}

async function reserveIds(db, count) {
  if (count <= 0) return [];
  if (dryRun) {
    // IDs ficticios para dry-run
    return Array.from({ length: count }, (_, i) => 900000 + i);
  }
  const metaRef = db.collection('migration_meta').doc('reclamos');
  const ids = await db.runTransaction(async (tx) => {
    const snap = await tx.get(metaRef);
    const current = snap.exists ? Number(snap.data().nextId || 1) : 1;
    const start = current;
    tx.set(metaRef, { nextId: current + count, updatedAt: new Date().toISOString() }, { merge: true });
    return Array.from({ length: count }, (_, i) => start + i);
  });
  return ids;
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
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function main() {
  if (skipAi) {
    throw new Error(
      'El modo --skip-ai está deshabilitado: la IA es obligatoria para excluir casos que no sean de consumidores.'
    );
  }

  console.log(`Import Drive → reclamos${dryRun ? ' (DRY RUN)' : ''}`);
  console.log(`Carpeta: ${FOLDER_ID}`);
  console.log(`Últimos ${years} años | responsable: ${RESPONSABLE.name} <${RESPONSABLE.email}>`);
  initFirebase();
  const db = admin.firestore();
  const { headers } = await getDriveClient();

  console.log('Listando Drive (puede demorar)...');
  const { folders, docs } = await walkDrive(headers, FOLDER_ID);
  console.log(`Encontrados: ${folders.length} carpetas, ${docs.length} documentos`);

  const cutoff = cutoffIso(years);
  console.log(`Corte fecha: ${cutoff}`);
  let units = buildCaseUnits(folders, docs, cutoff);
  console.log(`Casos candidatos (últimos ${years} años): ${units.length}`);

  const existing = await loadExistingDriveKeys(db);
  units = units.filter((u) => !existing.has(u.key));
  console.log(`Nuevos (no importados antes): ${units.length}`);

  if (limit != null && Number.isFinite(limit)) {
    units = units.slice(0, limit);
    console.log(`Limitado a ${units.length}`);
  }

  if (!units.length) {
    console.log('Nada para importar.');
    return;
  }

  const [empresasCatalog, estados, existingReclamos] = await Promise.all([
    loadEmpresas(db),
    loadEstados(db),
    loadExistingReclamos(db),
  ]);
  console.log(
    `Catálogo empresas: ${empresasCatalog.length} | estados: ${estados.size} | reclamos existentes: ${existingReclamos.length}`
  );
  console.log(
    `Gemini: extract=${GEMINI_MODEL} | classify=${GEMINI_MODEL_LITE} | cache=${noCache ? 'OFF' : AI_CACHE_PATH}`
  );

  const aiCache = loadAiCache();
  const aiStats = {
    cacheHitsClassify: 0,
    cacheHitsExtract: 0,
    apiClassify: 0,
    apiExtract: 0,
    skippedTitleNonConsumer: 0,
    skippedPreDuplicate: 0,
    skippedClassifyNonConsumer: 0,
  };

  console.log('Extrayendo texto + IA (prefiltro → dedupe → clasificar → extraer)...');
  const analyzed = await mapPool(units, GEMINI_CONCURRENCY, async (unit, i) => {
    process.stdout.write(`[${i + 1}/${units.length}] ${unit.title.slice(0, 70)}\n`);
    let extracted = null;
    let error = null;
    let primaryRawText = '';
    let primaryDoc = unit.primary || null;
    let skipReason = null;
    let preDuplicate = null;
    let matched = [];
    let otras = [];

    try {
      const titleSkip = guessNonConsumerFromTitle(unit.title);
      if (titleSkip.exclude) {
        aiStats.skippedTitleNonConsumer += 1;
        skipReason = titleSkip.reason;
        extracted = {
          esReclamoConsumidor: false,
          denunciante: guessNameFromTitle(unit.title),
          empresas: [],
          resumen: `Excluido sin IA: ${titleSkip.reason}`.slice(0, MAX_RESUMEN_CHARS),
          hecho: unit.title.slice(0, MAX_HECHO_CHARS),
          confianza: 0.9,
          notas: ['prefilter-title', titleSkip.reason],
        };
        return {
          unit,
          extracted,
          matched,
          otras,
          error: null,
          primaryRawText,
          primaryDoc,
          skipReason,
          preDuplicate: null,
        };
      }

      const gathered = await gatherCaseText(headers, unit);
      primaryRawText = gathered.primaryRawText || '';
      primaryDoc = gathered.primaryDoc || primaryDoc;

      preDuplicate = findDuplicatePreAi(
        unit,
        gathered.text || '',
        existingReclamos,
        empresasCatalog
      );
      if (preDuplicate) {
        aiStats.skippedPreDuplicate += 1;
        skipReason = preDuplicate.reason;
        extracted = {
          esReclamoConsumidor: true,
          denunciante: {
            ...guessNameFromTitle(unit.title),
            numeroDocumento: extractDniFromText(`${unit.title}\n${gathered.text || ''}`) || '',
          },
          empresas: parseEmpresaFromTitle(unit.title)
            ? [parseEmpresaFromTitle(unit.title)]
            : [],
          resumen: `Duplicado detectado pre-IA: ${preDuplicate.reason}`.slice(
            0,
            MAX_RESUMEN_CHARS
          ),
          hecho: unit.title.slice(0, MAX_HECHO_CHARS),
          confianza: 0.95,
          notas: ['pre-dedupe', preDuplicate.reason],
        };
        ({ matched, otras } = matchEmpresas(extracted.empresas || [], empresasCatalog));
        return {
          unit,
          extracted,
          matched,
          otras,
          error: null,
          primaryRawText,
          primaryDoc,
          skipReason,
          preDuplicate,
        };
      }

      if (skipAi) {
        extracted = {
          esReclamoConsumidor: true,
          denunciante: guessNameFromTitle(unit.title),
          empresas: [],
          resumen: `Caso histórico: ${unit.title}`.slice(0, MAX_RESUMEN_CHARS),
          hecho: gathered.text?.slice(0, MAX_HECHO_CHARS) || unit.title,
          confianza: 0.2,
          notas: ['skip-ai'],
        };
      } else if (looksLikeConsumerTitle(unit.title)) {
        // Caso típico "X c. Empresa": un solo pase de extracción (más barato).
        extracted = await extractCached(aiCache, unit, gathered, aiStats);
        extracted.esReclamoConsumidor = true;
        extracted.notas = [...(extracted.notas || []), 'title-consumer-skip-classify'];
      } else {
        const classification = await classifyCached(aiCache, unit, gathered, aiStats);
        if (classification?.esReclamoConsumidor !== true) {
          aiStats.skippedClassifyNonConsumer += 1;
          skipReason = classification?.motivo || 'clasificador: no consumidor';
          extracted = {
            esReclamoConsumidor: false,
            denunciante: guessNameFromTitle(unit.title),
            empresas: [],
            resumen: `No consumidor: ${skipReason}`.slice(0, MAX_RESUMEN_CHARS),
            hecho: unit.title.slice(0, MAX_HECHO_CHARS),
            confianza: Number(classification?.confianza) || 0.7,
            notas: ['classify', skipReason],
          };
        } else {
          extracted = await extractCached(aiCache, unit, gathered, aiStats);
        }
      }
    } catch (err) {
      error = err.message;
      extracted = {
        esReclamoConsumidor: false,
        denunciante: guessNameFromTitle(unit.title),
        empresas: [],
        resumen: `Caso histórico (IA falló): ${unit.title}`.slice(0, MAX_RESUMEN_CHARS),
        hecho: `Importación parcial. Error: ${err.message}`.slice(0, MAX_HECHO_CHARS),
        confianza: 0.1,
        notas: [`error: ${err.message}`],
      };
    }

    ({ matched, otras } = matchEmpresas(extracted?.empresas || [], empresasCatalog));
    return {
      unit,
      extracted,
      matched,
      otras,
      error,
      primaryRawText,
      primaryDoc,
      skipReason,
      preDuplicate,
    };
  });

  saveAiCache(aiCache);

  // Duplicados detectados antes de gastar (o re-gastar) extracción completa.
  const duplicates = [];
  const afterPreDedupe = [];
  for (const item of analyzed) {
    if (item.preDuplicate) {
      duplicates.push({
        driveKey: item.unit.key,
        title: item.unit.title,
        existingReclamoId: item.preDuplicate.id,
        reason: item.preDuplicate.reason,
      });
      continue;
    }
    afterPreDedupe.push(item);
  }

  // Regla permanente: solo se importan casos confirmados por IA (o flujo) como
  // reclamos de consumidores. Los dudosos, falsos y errores quedan afuera.
  const consumerCandidates = afterPreDedupe.filter(
    (item) => item.error == null && item.extracted?.esReclamoConsumidor === true
  );
  const excludedNonConsumer = afterPreDedupe.length - consumerCandidates.length;

  // Dedupe conservador contra TODO el sistema (SQL, formulario y Drive).
  // Si hay coincidencia fuerte, se excluye: es preferible omitir un caso
  // dudoso antes que contaminar estadísticas con una doble carga.
  const prepared = [];
  const dedupePool = [...existingReclamos];
  for (const item of consumerCandidates) {
    const duplicate = findDuplicate(item, dedupePool);
    if (duplicate) {
      duplicates.push({
        driveKey: item.unit.key,
        title: item.unit.title,
        existingReclamoId: duplicate.id,
        reason: duplicate.reason,
      });
      continue;
    }
    prepared.push(item);
    dedupePool.push({
      id: `drive:${item.unit.key}`,
      denunciante: item.extracted.denunciante,
      documentoSearch: item.extracted.denunciante?.numeroDocumento,
      empresaIds: item.matched.map((empresa) => empresa.id),
      empresas: item.matched,
      otrasEmpresas: item.otras.join('; '),
      resumen: item.extracted.resumen,
      hecho: item.extracted.hecho,
      numeroExpediente: item.extracted.numeroExpediente,
    });
  }

  const ids = await reserveIds(db, prepared.length);
  const docsToWrite = prepared.map((item, i) =>
    buildReclamoDoc({
      id: ids[i],
      unit: item.unit,
      extracted: item.extracted,
      empresasMatched: item.matched,
      otrasEmpresas: item.otras,
      estados,
    })
  );

  // Reporte
  const withEmpresa = docsToWrite.filter((d) => d.empresas?.length).length;
  const consumidor = prepared.length;
  const errors = analyzed.filter((p) => p.error).length;

  console.log('\n=== Resumen ===');
  console.log(`Candidatos procesados: ${analyzed.length}`);
  console.log(`Prefiltro título (no consumidor): ${aiStats.skippedTitleNonConsumer}`);
  console.log(`Dedupe pre-IA: ${aiStats.skippedPreDuplicate}`);
  console.log(`Clasificador → no consumidor: ${aiStats.skippedClassifyNonConsumer}`);
  console.log(`Excluidos (no consumidor/dudosos/error): ${excludedNonConsumer}`);
  console.log(`Duplicados excluidos: ${duplicates.length}`);
  console.log(`A escribir: ${docsToWrite.length}`);
  console.log(`Con empresa de catálogo: ${withEmpresa}`);
  console.log(`Marcados consumidor: ${consumidor}`);
  console.log(`Errores IA/texto: ${errors}`);
  console.log(
    `IA API: classify=${aiStats.apiClassify} extract=${aiStats.apiExtract} | cache hits: classify=${aiStats.cacheHitsClassify} extract=${aiStats.cacheHitsExtract}`
  );

  const reportPath = path.join(rootDir, 'imports', 'drive-import-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        dryRun,
        folderId: FOLDER_ID,
        years,
        cutoff,
        models: { extract: GEMINI_MODEL, classify: GEMINI_MODEL_LITE },
        analyzed: analyzed.length,
        aiStats,
        excludedNonConsumer,
        duplicatesExcluded: duplicates.length,
        duplicates,
        total: docsToWrite.length,
        withEmpresa,
        consumidor,
        errors,
        samples: docsToWrite.slice(0, 10).map((d, i) => ({
          id: d.id,
          title: prepared[i].unit.title,
          createdAt: d.createdAt,
          denunciante: `${d.denunciante.apellido}, ${d.denunciante.nombre}`,
          empresas: d.empresas.map((e) => e.nombre),
          otrasEmpresas: d.otrasEmpresas || null,
          resumen: d.resumen,
          esReclamoConsumidor: prepared[i].extracted?.esReclamoConsumidor,
          driveUrl: d.googleDrive || null,
          error: prepared[i].error || null,
        })),
      },
      null,
      2
    )
  );
  console.log(`Reporte: ${reportPath}`);
  if (!noCache) console.log(`Cache IA: ${AI_CACHE_PATH}`);

  if (dryRun) {
    console.log('\nDry-run: no se escribió en Firestore.');
    for (const sample of docsToWrite.slice(0, 5)) {
      console.log(
        `  · #${sample.id} ${sample.createdAt.slice(0, 10)} | ${sample.denunciante.apellido}, ${sample.denunciante.nombre} | ${(sample.empresas[0]?.nombre || sample.otrasEmpresas || 'sin empresa').slice(0, 40)} | ${sample.resumen.slice(0, 60)}`
      );
    }
    await createSnapshotsForImportedCases(db, headers, prepared, docsToWrite);
    return;
  }

  // Escritura en batches
  const BATCH = 400;
  for (let i = 0; i < docsToWrite.length; i += BATCH) {
    const chunk = docsToWrite.slice(i, i + BATCH);
    const batch = db.batch();
    for (const doc of chunk) {
      batch.set(db.collection('reclamos').doc(String(doc.id)), doc, { merge: false });
    }
    await batch.commit();
    console.log(`Escritos ${Math.min(i + BATCH, docsToWrite.length)}/${docsToWrite.length}`);
  }

  await createSnapshotsForImportedCases(db, headers, prepared, docsToWrite);

  console.log('Listo.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
