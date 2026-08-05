#!/usr/bin/env node
/**
 * Diagnostica la verificación por arrastre de PDF.
 *
 * Uso:
 *   node scripts/diagnose-informe-hash.mjs
 *   node scripts/diagnose-informe-hash.mjs "C:\\Users\\Adrian\\Downloads\\informe.pdf"
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { initializeApp, cert, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(rootDir, '.env.local') });

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function initAdmin() {
  if (getApps().length) return;
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    (projectId ? `${projectId}.firebasestorage.app` : undefined);
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (credPath && fs.existsSync(credPath)) {
    initializeApp({
      credential: cert(JSON.parse(fs.readFileSync(credPath, 'utf8'))),
      projectId,
      storageBucket,
    });
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      projectId,
      storageBucket,
    });
  } else {
    initializeApp({ credential: applicationDefault(), projectId, storageBucket });
  }
}

async function main() {
  initAdmin();
  const db = getFirestore();
  const bucket = getStorage().bucket();

  console.log(`Proyecto: ${process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
  console.log(`Bucket:   ${bucket.name}\n`);

  const snap = await db.collection('informes_pedidos').get();
  console.log(`Pedidos en Firestore: ${snap.size}\n`);

  const registry = new Map();

  for (const doc of snap.docs) {
    const d = doc.data();
    console.log(`— ${d.codigo}  estado=${d.estado}`);
    console.log(`  empresa: ${d.empresaNombre} (#${d.empresaId})`);
    console.log(`  pdfPath: ${d.pdfPath || '(sin archivo)'}`);
    console.log(`  pdfHash: ${d.pdfHash || '(sin hash)'}`);
    console.log(`  pdfBytes: ${d.pdfBytes ?? '?'}`);

    if (d.pdfHash) registry.set(String(d.pdfHash).toLowerCase(), d.codigo);

    if (d.pdfPath) {
      try {
        const [buf] = await bucket.file(d.pdfPath).download();
        const actual = sha256(buf);
        const ok = actual === String(d.pdfHash || '').toLowerCase();
        console.log(`  hash real del archivo en Storage: ${actual} ${ok ? '(coincide)' : '(NO COINCIDE)'}`);
        registry.set(actual, d.codigo);
      } catch (err) {
        console.log(`  no se pudo descargar de Storage: ${err.message}`);
      }
    }
    console.log('');
  }

  const explicit = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const downloads = path.join(process.env.USERPROFILE || rootDir, 'Downloads');
  const candidates = explicit.length
    ? explicit
    : fs.existsSync(downloads)
      ? fs
          .readdirSync(downloads)
          .filter((f) => f.toLowerCase().endsWith('.pdf') && f.toLowerCase().includes('informe'))
          .map((f) => path.join(downloads, f))
      : [];

  if (!candidates.length) {
    console.log('No hay PDFs locales para comparar.');
    return;
  }

  console.log('PDFs locales:');
  for (const file of candidates) {
    if (!fs.existsSync(file)) {
      console.log(`  ${file} — no existe`);
      continue;
    }
    const buf = fs.readFileSync(file);
    const hash = sha256(buf);
    const match = registry.get(hash);
    console.log(`  ${path.basename(file)}`);
    console.log(`    bytes: ${buf.length}`);
    console.log(`    sha256: ${hash}`);
    console.log(`    ${match ? `VERIFICA como ${match}` : 'NO está registrado en Firestore'}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
