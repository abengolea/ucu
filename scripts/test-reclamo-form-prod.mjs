#!/usr/bin/env node
/**
 * Prueba el formulario público de reclamos contra producción (o local).
 *
 * Por defecto solo diagnostica (página, catálogos, validación).
 * Con --submit crea un reclamo real marcado como PRUEBA.
 *
 * Hallazgo (2026-08-05): POST /api/reclamos devolvía 500 porque el documento
 * llevaba campos `undefined` (piso/depto/changedBy*) y Firestore los rechaza.
 * Fix: ignoreUndefinedProperties + builders sin undefined.
 *
 * Uso:
 *   node scripts/test-reclamo-form-prod.mjs
 *   node scripts/test-reclamo-form-prod.mjs --submit --email=tu@mail.com
 *   node scripts/test-reclamo-form-prod.mjs --submit --email=tu@mail.com --verify-db
 *   node scripts/test-reclamo-form-prod.mjs --local --submit --email=tu@mail.com
 *   node scripts/test-reclamo-form-prod.mjs --history
 *
 * --verify-db / --history requieren Firebase Admin en .env.local
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env.local') });

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function flag(name) {
  return process.argv.includes(`--${name}`);
}

const BASE = (
  flag('local')
    ? process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9005'
    : 'https://ucu.org.ar'
).replace(/\/$/, '');

const DO_SUBMIT = flag('submit');
const VERIFY_DB = flag('verify-db');
const EMAIL = arg('email', 'prueba-formulario@ucu.org.ar');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');

function log(step, msg) {
  console.log(`[${step}] ${msg}`);
}

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  console.log(`  ✗ ${msg}`);
}

async function fetchJson(pathname, opts = {}) {
  const started = Date.now();
  const res = await fetch(`${BASE}${pathname}`, {
    ...opts,
    headers: {
      Accept: 'application/json',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...opts.headers,
    },
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 400) };
  }
  return { status: res.status, ms: Date.now() - started, data, ok: res.ok };
}

async function initFirestore() {
  const { initializeApp, cert, getApps } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!getApps().length) {
    if (credPath && fs.existsSync(credPath)) {
      initializeApp({ credential: cert(credPath), projectId });
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        projectId,
      });
    } else {
      throw new Error('Firebase Admin no configurado en .env.local');
    }
  }
  return getFirestore();
}

async function diagnoseCatalogs() {
  log('1', `Página ${BASE}/reclamos/nuevo`);
  const page = await fetch(`${BASE}/reclamos/nuevo`);
  if (page.ok) ok(`HTTP ${page.status} (${Date.now()} ok)`);
  else fail(`HTTP ${page.status}`);

  log('2', 'Catálogo provincias');
  const provincias = await fetchJson('/api/reclamos/catalogos/provincias');
  if (!provincias.ok || !Array.isArray(provincias.data) || !provincias.data.length) {
    fail(`status=${provincias.status} body=${JSON.stringify(provincias.data).slice(0, 200)}`);
    return null;
  }
  ok(`${provincias.data.length} provincias en ${provincias.ms}ms`);

  const provincia =
    provincias.data.find((p) => /buenos aires/i.test(p.nombre)) || provincias.data[0];

  log('3', `Catálogo ciudades (provincia ${provincia.id} ${provincia.nombre})`);
  const ciudades = await fetchJson(
    `/api/reclamos/catalogos/ciudades?idProvincia=${provincia.id}`
  );
  if (!ciudades.ok || !Array.isArray(ciudades.data) || !ciudades.data.length) {
    fail(`status=${ciudades.status}`);
    return null;
  }
  ok(`${ciudades.data.length} ciudades en ${ciudades.ms}ms`);

  const ciudad =
    ciudades.data.find((c) => /san nicol/i.test(c.nombre)) ||
    ciudades.data.find((c) => /la plata/i.test(c.nombre)) ||
    ciudades.data[0];

  log('4', 'Búsqueda empresas');
  const empresas = await fetchJson('/api/reclamos/catalogos/empresas?q=eden');
  if (!empresas.ok) {
    fail(`status=${empresas.status} ${JSON.stringify(empresas.data).slice(0, 200)}`);
  } else {
    const list = Array.isArray(empresas.data) ? empresas.data : empresas.data?.items || [];
    ok(`${list.length} resultados en ${empresas.ms}ms`);
  }

  log('5', 'Validación POST vacío (espera 400)');
  const empty = await fetchJson('/api/reclamos', { method: 'POST', body: '{}' });
  if (empty.status === 400 && empty.data?.error) {
    ok(`400 — ${empty.data.error} (${empty.ms}ms)`);
  } else {
    fail(`esperado 400, got ${empty.status} ${JSON.stringify(empty.data)}`);
  }

  return { provincia, ciudad, empresas: empresas.data };
}

function buildPayload(provincia, ciudad, empresaIds = []) {
  return {
    nombre: 'PRUEBA',
    apellido: 'FORMULARIO AUTOMATICO',
    tipoDocumento: 'DNI',
    numeroDocumento: '99999999',
    calle: 'Calle de prueba',
    numero: '123',
    provinciaId: provincia.id,
    ciudadId: ciudad.id,
    telefono: '3364123456',
    email: EMAIL,
    resumen: `PRUEBA AUTOMATICA formulario ${stamp}`.slice(0, 150),
    hecho: [
      'Este es un reclamo de PRUEBA generado por scripts/test-reclamo-form-prod.mjs.',
      'Puede archivarse o eliminarse. No corresponde a un caso real.',
      `Timestamp: ${stamp}`,
      `Base: ${BASE}`,
    ].join(' '),
    otrasEmpresas: empresaIds.length ? undefined : 'Empresa de prueba (script prod)',
    empresaIds,
  };
}

async function submitReclamo(payload) {
  log('6', `POST /api/reclamos → ${EMAIL}`);
  const res = await fetchJson('/api/reclamos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  console.log(`  status=${res.status} ms=${res.ms}`);
  console.log(`  body=${JSON.stringify(res.data)}`);
  if (!res.ok || !res.data?.id) {
    fail('El alta falló');
    return null;
  }
  ok(`Reclamo creado #${res.data.id}`);
  return res.data.id;
}

async function verifyInDb(id) {
  log('7', `Verificar Firestore reclamos/${id}`);
  const db = await initFirestore();
  const snap = await db.collection('reclamos').doc(String(id)).get();
  if (!snap.exists) {
    fail('Documento no encontrado');
    return;
  }
  const d = snap.data();
  const hist = JSON.stringify(d.historialEstados || []);
  ok(`createdAt=${d.createdAt}`);
  ok(`bandeja=${d.adminBandeja}`);
  ok(`email=${d.denunciante?.email}`);
  ok(`resumen=${(d.resumen || '').slice(0, 80)}`);
  if (/formulario p/i.test(hist)) ok('historial: formulario público');
  else fail('historial sin marca de formulario público');

  const meta = await db.collection('migration_meta').doc('reclamos').get();
  ok(`nextId=${meta.data()?.nextId}`);
}

async function reportRecentPublic() {
  if (!VERIFY_DB && !flag('history')) return;
  log('H', 'Últimos reclamos del formulario público (Firestore)');
  try {
    const db = await initFirestore();
    const snap = await db.collection('reclamos').orderBy('id', 'desc').limit(300).get();
    const publicOnes = [];
    for (const doc of snap.docs) {
      const d = doc.data();
      if (!/formulario p/i.test(JSON.stringify(d.historialEstados || []))) continue;
      publicOnes.push({
        id: d.id,
        createdAt: d.createdAt,
        bandeja: d.adminBandeja,
        email: d.denunciante?.email,
        nombre: [d.denunciante?.nombre, d.denunciante?.apellido].filter(Boolean).join(' '),
        resumen: (d.resumen || '').slice(0, 70),
      });
    }
    if (!publicOnes.length) {
      fail('Ninguno en los últimos 300');
      return;
    }
    ok(`${publicOnes.length} en los últimos 300`);
    for (const row of publicOnes.slice(0, 10)) {
      console.log(`    #${row.id} ${row.createdAt} [${row.bandeja}] ${row.email} — ${row.resumen}`);
    }
  } catch (err) {
    fail(String(err.message || err));
  }
}

async function main() {
  console.log(`\nTest formulario reclamos → ${BASE}`);
  console.log(`submit=${DO_SUBMIT} email=${EMAIL}\n`);

  const ctx = await diagnoseCatalogs();
  if (!ctx) {
    process.exitCode = 1;
    return;
  }

  await reportRecentPublic();

  if (!DO_SUBMIT) {
    console.log('\nDiagnóstico OK. Para crear un reclamo real:');
    console.log(`  node scripts/test-reclamo-form-prod.mjs --submit --email=tu@mail.com --verify-db\n`);
    return;
  }

  const list = Array.isArray(ctx.empresas)
    ? ctx.empresas
    : ctx.empresas?.items || [];
  const empresaIds = list[0]?.id ? [list[0].id] : [];
  const payload = buildPayload(ctx.provincia, ctx.ciudad, empresaIds);
  const id = await submitReclamo(payload);
  if (!id) {
    process.exitCode = 1;
    return;
  }

  if (VERIFY_DB) await verifyInDb(id);

  console.log(`\nListo. Revisá #${id} en admin / bandeja recibidos.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
