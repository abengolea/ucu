#!/usr/bin/env node
/**
 * Importa el catálogo ampliado de causas (Excel UCU 2026) a Firestore.
 *
 *   node scripts/import-causas-catalogo.mjs --dry-run
 *   node scripts/import-causas-catalogo.mjs --file="C:\Users\Adrian\Downloads\UCU_catalogo_ampliado_causas_2026.xlsx"
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env.local') });

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const fileArg = args.find((arg) => arg.startsWith('--file='));
const defaultFile = path.join(
  process.env.USERPROFILE || '',
  'Downloads',
  'UCU_catalogo_ampliado_causas_2026.xlsx'
);
const filePath = fileArg ? fileArg.slice('--file='.length) : defaultFile;

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

function normalizeKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function loadRowsFromXlsx(xlsxPath) {
  if (!fs.existsSync(xlsxPath)) {
    throw new Error(`No encontré el archivo: ${xlsxPath}`);
  }

  const py = `
import json, openpyxl, sys
wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
ws = wb['Nuevas causas']
rows = []
for i, row in enumerate(ws.iter_rows(values_only=True), 1):
    if i == 1:
        continue
    desc = str(row[1] or '').strip()
    if not desc:
        continue
    keywords = [k.strip() for k in str(row[4] or '').split(';') if k.strip()]
    rows.append({
        'id': int(row[0]),
        'descripcion': desc,
        'activo': True,
        'rubro': str(row[3] or '').strip(),
        'keywords': keywords,
        'prioridad': str(row[5] or '').strip(),
        'source': 'import',
    })
print(json.dumps(rows, ensure_ascii=False))
`;

  const out = execFileSync('python', ['-c', py, xlsxPath], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  return JSON.parse(out);
}

async function main() {
  const incoming = loadRowsFromXlsx(filePath);
  console.log(`Excel: ${incoming.length} causas desde ${filePath}`);

  initFirebase();
  const db = admin.firestore();
  const snap = await db.collection('reclamos_causas').get();
  const existing = snap.docs.map((doc) => doc.data());
  const byId = new Map(existing.map((item) => [Number(item.id), item]));
  const byDesc = new Map(
    existing.map((item) => [normalizeKey(item.descripcion), Number(item.id)])
  );

  const toWrite = [];
  const skipped = [];

  for (const row of incoming) {
    const descKey = normalizeKey(row.descripcion);
    const current = byId.get(row.id);
    const otherId = byDesc.get(descKey);

    if (current) {
      skipped.push({ id: row.id, reason: 'id-existe', descripcion: row.descripcion });
      continue;
    }
    if (otherId && otherId !== row.id) {
      skipped.push({
        id: row.id,
        reason: `descripcion-duplicada-id-${otherId}`,
        descripcion: row.descripcion,
      });
      continue;
    }

    toWrite.push({
      id: row.id,
      descripcion: row.descripcion,
      activo: true,
      source: 'import',
      updatedAt: new Date().toISOString(),
      ...(row.rubro ? { rubro: row.rubro } : {}),
      ...(row.keywords?.length ? { keywords: row.keywords } : {}),
      ...(row.prioridad ? { prioridad: row.prioridad } : {}),
    });
  }

  console.log(`A crear: ${toWrite.length} | omitidas: ${skipped.length}`);
  if (skipped.length) {
    console.log(
      'Omitidas (primeras 10):',
      skipped.slice(0, 10).map((item) => `${item.id} ${item.reason}`)
    );
  }

  if (dryRun) {
    console.log('DRY-RUN: no se escribió nada.');
    const reportPath = path.join(rootDir, 'tmp', 'import-causas-catalogo-dry-run.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(
      reportPath,
      JSON.stringify({ filePath, toWrite: toWrite.length, skipped }, null, 2)
    );
    return;
  }

  const batchSize = 400;
  for (let index = 0; index < toWrite.length; index += batchSize) {
    const batch = db.batch();
    for (const item of toWrite.slice(index, index + batchSize)) {
      batch.set(db.collection('reclamos_causas').doc(String(item.id)), item);
    }
    await batch.commit();
    console.log(`Firestore: ${Math.min(index + batchSize, toWrite.length)}/${toWrite.length}`);
  }

  const importedIds = toWrite.map((item) => item.id);
  const metaRef = db.collection('migration_meta').doc('reclamos_catalogs');
  const metaSnap = await metaRef.get();
  const deletedIds = Array.isArray(metaSnap.data()?.deletedCausaIds)
    ? metaSnap.data().deletedCausaIds.map(Number)
    : [];
  const resurrected = importedIds.filter((id) => deletedIds.includes(id));
  const metaPatch = {
    catalogoAmpliadoImportedAt: new Date().toISOString(),
    catalogoAmpliadoCount: importedIds.length,
  };
  if (resurrected.length) {
    metaPatch.deletedCausaIds = admin.firestore.FieldValue.arrayRemove(...resurrected);
  }
  await metaRef.set(metaPatch, { merge: true });

  const reportPath = path.join(rootDir, 'tmp', 'import-causas-catalogo-2026.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        filePath,
        created: importedIds,
        skipped,
        createdCount: importedIds.length,
        skippedCount: skipped.length,
      },
      null,
      2
    )
  );
  console.log(`Listo. Reporte: ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
