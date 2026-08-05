#!/usr/bin/env node
/**
 * Crea un pedido de informe de prueba a $10 ARS y abre el checkout de Mercado Pago.
 *
 * Uso:
 *   node scripts/test-mp-pago-10.mjs --email=tu@mail.com
 *   node scripts/test-mp-pago-10.mjs --email=tu@mail.com --empresa=123
 *   node scripts/test-mp-pago-10.mjs --email=tu@mail.com --empresa-nombre=Telecom
 *
 * Requiere en .env.local:
 *   MERCADOPAGO_ACCESS_TOKEN  (o se lee de GCP Secret Manager)
 *   Firebase Admin (GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_*)
 */
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { MercadoPagoConfig, Preference } from 'mercadopago';

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

const PRECIO_ARS = 10;
const PRECIO_CENTS = PRECIO_ARS * 100;
// Por defecto producción: el webhook y el redirect tienen que apuntar a ucu.org.ar.
// Usá --local para probar contra NEXT_PUBLIC_APP_URL de .env.local.
const SITE_URL = (
  flag('local')
    ? process.env.NEXT_PUBLIC_APP_URL || process.env.RECLAMOS_SITE_URL || 'http://localhost:9005'
    : 'https://ucu.org.ar'
).replace(/\/$/, '');

function log(msg) {
  console.log(msg);
}

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

function resolveAccessToken() {
  const fromEnv = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (fromEnv && fromEnv.length > 20) return fromEnv;

  try {
    const token = execFileSync(
      'gcloud',
      [
        'secrets',
        'versions',
        'access',
        'latest',
        '--secret=MERCADOPAGO_ACCESS_TOKEN',
        '--project=ucuweb-2887d',
      ],
      { encoding: 'utf8' }
    ).trim();
    if (token.length > 20) return token;
  } catch {
    // ignore
  }

  fail(
    'No hay MERCADOPAGO_ACCESS_TOKEN. Ponelo en .env.local o asegurate de estar logueado en gcloud.'
  );
}

async function initFirestore() {
  const { initializeApp, cert, getApps, applicationDefault } = await import(
    'firebase-admin/app'
  );
  const { getFirestore } = await import('firebase-admin/firestore');

  if (!getApps().length) {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const projectId =
      process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (credPath && fs.existsSync(credPath)) {
      initializeApp({
        credential: cert(JSON.parse(fs.readFileSync(credPath, 'utf8'))),
        projectId,
      });
    } else if (
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        projectId,
      });
    } else {
      initializeApp({ credential: applicationDefault(), projectId });
    }
  }

  return getFirestore();
}

function generateCodigo() {
  const raw = crypto.randomBytes(5).toString('hex').toUpperCase();
  return `UCU-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

async function resolveEmpresa(db, empresaIdArg, empresaNombreArg) {
  if (empresaIdArg) {
    const id = Number(empresaIdArg);
    const snap = await db.collection('reclamos_empresas').doc(String(id)).get();
    if (!snap.exists) fail(`Empresa id=${id} no existe en reclamos_empresas`);
    const data = snap.data();
    return { id, nombre: data.nombre || `Empresa ${id}` };
  }

  if (empresaNombreArg) {
    const q = empresaNombreArg.toLowerCase();
    const snap = await db.collection('reclamos_empresas').limit(500).get();
    const hit = snap.docs
      .map((d) => d.data())
      .find((e) => String(e.nombre || '').toLowerCase().includes(q));
    if (!hit?.id) fail(`No encontré empresa con nombre que contenga "${empresaNombreArg}"`);
    return { id: Number(hit.id), nombre: hit.nombre };
  }

  // Primera empresa con al menos 1 reclamo en el índice
  const indexSnap = await db.collection('reclamos_busqueda').limit(50).get();
  for (const doc of indexSnap.docs) {
    const ids = doc.data().empresaIds;
    if (Array.isArray(ids) && ids.length) {
      const id = Number(ids[0]);
      const emp = await db.collection('reclamos_empresas').doc(String(id)).get();
      if (emp.exists) {
        return { id, nombre: emp.data().nombre || `Empresa ${id}` };
      }
    }
  }

  fail('No encontré ninguna empresa con reclamos. Pasá --empresa=ID');
}

async function loadStats(db, empresaId) {
  const snap = await db
    .collection('reclamos_busqueda')
    .where('empresaIds', 'array-contains', empresaId)
    .get();

  const porCausaMap = new Map();
  let sinCausa = 0;
  let minDate = null;
  let maxDate = null;

  for (const doc of snap.docs) {
    const d = doc.data();
    const causas = Array.isArray(d.causaTextos)
      ? d.causaTextos.map((c) => String(c).trim()).filter(Boolean)
      : [];
    if (!causas.length) sinCausa += 1;
    for (const causa of causas) {
      porCausaMap.set(causa, (porCausaMap.get(causa) ?? 0) + 1);
    }
    const day = String(d.createdAt || '').slice(0, 10);
    if (day) {
      if (!minDate || day < minDate) minDate = day;
      if (!maxDate || day > maxDate) maxDate = day;
    }
  }

  const porCausa = [...porCausaMap.entries()]
    .map(([causa, count]) => ({ causa, count }))
    .sort((a, b) => b.count - a.count || a.causa.localeCompare(b.causa, 'es'));
  if (sinCausa > 0) {
    porCausa.push({ causa: 'Sin causa tipificada', count: sinCausa });
  }

  return {
    total: snap.size,
    rangoFechas: { desde: minDate, hasta: maxDate },
    porCausa: porCausa.slice(0, 12),
    sintesis: null,
    temas: null,
  };
}

const email = arg('email', process.env.TEST_EMAIL || '').trim().toLowerCase();
if (!email || !email.includes('@')) {
  fail('Pasá --email=tu@mail.com (ahí llega el PDF si el webhook funciona)');
}

const dry = flag('dry-run');
const token = resolveAccessToken();
const db = await initFirestore();
const empresa = await resolveEmpresa(db, arg('empresa'), arg('empresa-nombre'));
const stats = await loadStats(db, empresa.id);

log('');
log('=== Prueba de pago Mercado Pago ($10) ===');
log(`  Empresa:  ${empresa.nombre} (#${empresa.id})`);
log(`  Reclamos: ${stats.total}`);
log(`  Email:    ${email}`);
log(`  Precio:   $${PRECIO_ARS} ARS`);
log(`  Site:     ${SITE_URL}`);
log('');

if (stats.total < 1) {
  log('⚠ La empresa no tiene reclamos indexados; el PDF saldrá con total 0.');
}

const now = new Date().toISOString();
const ref = db.collection('informes_pedidos').doc();
const codigo = generateCodigo();
const pedido = {
  id: ref.id,
  codigo,
  empresaId: empresa.id,
  empresaNombre: empresa.nombre,
  email,
  precioCents: PRECIO_CENTS,
  moneda: 'ARS',
  estado: 'pending_payment',
  statsSnapshot: stats,
  createdAt: now,
  updatedAt: now,
};

if (dry) {
  log('[dry-run] No se crea pedido ni preferencia.');
  log(JSON.stringify({ pedidoId: ref.id, codigo, empresa, stats }, null, 2));
  process.exit(0);
}

await ref.set(pedido);
log(`✓ Pedido creado: ${ref.id}`);
log(`  Código: ${codigo}`);

const mp = new Preference(new MercadoPagoConfig({ accessToken: token }));
const isPublic = SITE_URL.startsWith('https://') && !SITE_URL.includes('localhost');

const preference = await mp.create({
  body: {
    items: [
      {
        id: ref.id,
        title: `PRUEBA $10 — Informe UCU — ${empresa.nombre}`,
        description: `Prueba de pago ${codigo}`,
        quantity: 1,
        currency_id: 'ARS',
        unit_price: PRECIO_ARS,
      },
    ],
    payer: { email },
    external_reference: ref.id,
    metadata: { pedido_id: ref.id, codigo, prueba: true },
    back_urls: {
      success: `${SITE_URL}/reclamos/estadisticas/pago?status=success&pedido=${ref.id}`,
      failure: `${SITE_URL}/reclamos/estadisticas/pago?status=failure&pedido=${ref.id}`,
      pending: `${SITE_URL}/reclamos/estadisticas/pago?status=pending&pedido=${ref.id}`,
    },
    ...(isPublic ? { auto_return: 'approved' } : {}),
    ...(isPublic ? { notification_url: `${SITE_URL}/api/webhooks/mercadopago` } : {}),
    statement_descriptor: 'UCU PRUEBA',
  },
});

const preferenceId = preference.id;
const initPoint = preference.init_point || preference.sandbox_init_point;
if (!preferenceId || !initPoint) {
  fail('Mercado Pago no devolvió init_point');
}

await ref.set({ mpPreferenceId: preferenceId, updatedAt: new Date().toISOString() }, { merge: true });

log(`✓ Preferencia MP: ${preferenceId}`);
log('');
log('Abrí este link y pagá $10:');
log('');
log(`  ${initPoint}`);
log('');
log('Después del pago:');
log(`  Estado:     ${SITE_URL}/reclamos/estadisticas/pago?status=success&pedido=${ref.id}`);
log(`  Verificar:  ${SITE_URL}/verificar/${codigo}`);
log(`  Descargar:  ${SITE_URL}/api/informes/download/${codigo}`);
log('');

if (flag('open')) {
  const { exec } = await import('node:child_process');
  const cmd =
    process.platform === 'win32'
      ? `start "" "${initPoint}"`
      : process.platform === 'darwin'
        ? `open "${initPoint}"`
        : `xdg-open "${initPoint}"`;
  exec(cmd);
  log('✓ Navegador abierto');
}
