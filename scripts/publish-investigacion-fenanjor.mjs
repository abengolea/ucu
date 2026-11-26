#!/usr/bin/env node
/**
 * Publica el Observatorio Fenanjor en /investigaciones/fenanjor.
 * Arma la carpeta de ingestión, vincula o crea la empresa en reclamos_empresas
 * y deja HTML + bases en Storage / public/inv.
 *
 *   node scripts/publish-investigacion-fenanjor.mjs
 *   node scripts/publish-investigacion-fenanjor.mjs --dry-run
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env.local') });

const SLUG = 'fenanjor';
const CUIT = '30-70050501-0';
const CUIT_DIGITS = '30700505010';
const EMPRESA_NOMBRE =
  'COOPERATIVA DE VIVIENDA, CRÉDITO Y CONSUMO FENANJOR LTDA.';
const EMPRESA_SEARCH =
  'cooperativa fenanjor fenanjor ltda vivienda credito consumo';
const SOURCE_DIR = path.join(rootDir, 'tmp', 'observatorio-fenanjor');
const STAGE_DIR = path.join(rootDir, 'tmp', 'fenanjor-ingest');

const TITLE =
  'Débitos que nadie autorizó: 870 reclamos contra Fenanjor por cobros en cuentas sueldo y jubilaciones';
const EXCERPT =
  'Personas que no conocen a la cooperativa encuentran débitos a su nombre, mes a mes. Cuando reclaman, la empresa contesta con un mismo texto: dice que cobra «por cuenta y orden de terceros» y pide el DNI por Gmail. Quien insiste a veces recupera la plata. Quien no se da cuenta, sigue pagando.';

const DOWNLOADS = [
  ['Informe juridico - Fenanjor.pdf', '01-informe-juridico-fenanjor.pdf'],
  ['Informe juridico - Fenanjor.docx', '01-informe-juridico-fenanjor.docx'],
  ['Anexo de evidencia - Fenanjor.pdf', '02-anexo-de-evidencia-fenanjor.pdf'],
  ['Anexo de evidencia - Fenanjor.docx', '02-anexo-de-evidencia-fenanjor.docx'],
  ['Base Fenanjor - Observatorio UCU.xlsx', '03-base-completa-fenanjor.xlsx'],
  ['Base Fenanjor - Observatorio UCU.csv', '04-base-abierta-fenanjor.csv'],
  ['Control de extraccion - Fenanjor.xlsx', '05-control-de-extraccion-fenanjor.xlsx'],
];

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
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

function cuitDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function patchHtml(html) {
  let out = html;
  for (const [from, to] of DOWNLOADS) {
    out = out.replaceAll(`descargas/${from}`, `descargas/${to}`);
  }
  out = out.replaceAll(' download>', ' target="_blank" rel="noopener">');
  out = out.replace(
    '<a class="btn" href="https://ucu.org.ar" target="_blank" rel="noopener">Contactar a UCU en ucu.org.ar</a>',
    '<a class="btn" href="/reclamos/nuevo" target="_top">Hacé tu denuncia en UCU</a>'
  );
  return out;
}

function stageFiles() {
  if (!fs.existsSync(path.join(SOURCE_DIR, 'index.html'))) {
    throw new Error(`No está el zip extraído en ${SOURCE_DIR}`);
  }

  fs.rmSync(STAGE_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(STAGE_DIR, 'descargas'), { recursive: true });

  const html = patchHtml(fs.readFileSync(path.join(SOURCE_DIR, 'index.html'), 'utf8'));
  fs.writeFileSync(path.join(STAGE_DIR, 'index.html'), html, 'utf8');
  fs.copyFileSync(path.join(SOURCE_DIR, 'datos.js'), path.join(STAGE_DIR, 'datos.js'));

  for (const [from, to] of DOWNLOADS) {
    const src = path.join(SOURCE_DIR, 'descargas', from);
    if (!fs.existsSync(src)) throw new Error(`Falta ${from}`);
    fs.copyFileSync(src, path.join(STAGE_DIR, 'descargas', to));
  }

  console.log('Carpeta de ingestión:', STAGE_DIR);
}

async function ensureEmpresa() {
  initFirebase();
  const db = admin.firestore();
  const snap = await db.collection('reclamos_empresas').get();
  let maxId = 0;
  const hits = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const id = Number(data.id ?? doc.id);
    if (Number.isFinite(id) && id > maxId) maxId = id;
    const blob = `${data.nombre || ''} ${data.nombreSearch || ''} ${data.cuit || ''}`.toLowerCase();
    const digits = cuitDigits(data.cuit);
    if (digits === CUIT_DIGITS || blob.includes('fenanjor')) {
      hits.push({
        id,
        nombre: data.nombre,
        cuit: data.cuit || null,
        nombreSearch: data.nombreSearch || '',
      });
    }
  }

  hits.sort((a, b) => a.id - b.id);
  const byCuit = hits.find((h) => cuitDigits(h.cuit) === CUIT_DIGITS);
  const existing = byCuit || hits[0] || null;
  console.log('Empresas Fenanjor en catálogo:', hits);

  if (existing) {
    const patch = {
      nombre: EMPRESA_NOMBRE,
      nombreSearch: EMPRESA_SEARCH,
      cuit: CUIT,
      activo: true,
      updatedAt: new Date().toISOString(),
    };
    if (!hasFlag('dry-run')) {
      await db.collection('reclamos_empresas').doc(String(existing.id)).set(patch, { merge: true });
    }
    console.log('Empresa vinculada:', { id: existing.id, ...patch });
    return { id: existing.id, nombre: EMPRESA_NOMBRE };
  }

  const created = {
    id: maxId + 1,
    nombre: EMPRESA_NOMBRE,
    nombreSearch: EMPRESA_SEARCH,
    cuit: CUIT,
    activo: true,
    updatedAt: new Date().toISOString(),
    syncSource: 'publish-investigacion-fenanjor',
  };
  if (!hasFlag('dry-run')) {
    await db.collection('reclamos_empresas').doc(String(created.id)).set(created);
  }
  console.log('Empresa creada:', created);
  return { id: created.id, nombre: created.nombre };
}

function runIngest(empresa) {
  const args = [
    path.join(rootDir, 'scripts', 'ingest-investigacion.mjs'),
    `--dir=${STAGE_DIR}`,
    `--slug=${SLUG}`,
    `--title=${TITLE}`,
    `--excerpt=${EXCERPT}`,
    `--empresa=${empresa.nombre}`,
    `--empresa-id=${empresa.id}`,
    '--member=Adrián Bengolea',
    '--ai=Claude',
    '--cta=Abrir investigación',
    `--status=${hasFlag('draft') ? 'draft' : 'publish'}`,
  ];
  if (hasFlag('dry-run')) args.push('--dry-run');

  const result = spawnSync(process.execPath, args, {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`ingest-investigacion salió con código ${result.status}`);
  }
}

async function main() {
  stageFiles();
  const empresa = await ensureEmpresa();
  runIngest(empresa);
  console.log('Listo: /investigaciones/' + SLUG);
  console.log('Denuncias UCU: /empresas/' + empresa.id);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
