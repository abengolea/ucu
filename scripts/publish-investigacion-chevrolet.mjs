#!/usr/bin/env node
/**
 * Publica el Observatorio Chevrolet como primera investigación UCU.
 *   node scripts/publish-investigacion-chevrolet.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env.local') });

const SLUG = 'chevrolet-ahorro';
const ASSET = '/inv/chevrolet-ahorro';
const RAW = path.join(rootDir, 'tmp', 'chevrolet-observatorio.html');
const PUBLIC_HTML = path.join(rootDir, 'public', 'inv', 'chevrolet-ahorro', 'index.html');

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

function cleanHtml(raw) {
  let html = raw.replace(/<!-- frame-runtime -->[\s\S]*?<!-- \/frame-runtime -->/, '');

  html = html.replaceAll('src="logo-ucu.png"', `src="${ASSET}/logo-ucu.png"`);
  html = html.replaceAll('src="logo-ucu-white.png"', `src="${ASSET}/logo-ucu-white.png"`);
  html = html.replaceAll("fetch('datos/reclamos.json')", `fetch('${ASSET}/datos/reclamos.json')`);
  html = html.replaceAll("fetch('descargas/'", `fetch('${ASSET}/descargas/'`);
  html = html.replaceAll("'descargas/", `'${ASSET}/descargas/`);
  html = html.replaceAll('"descargas/', `"${ASSET}/descargas/`);

  html = html.replace(
    /const FILES=\[[\s\S]*?\];/,
    `const FILES=[['01-informe-juridico-chevrolet.pdf','Informe jurídico','Hallazgos y encuadre en la Ley 24.240 y el Código Civil y Comercial.','${ASSET}/descargas/01-informe-juridico-chevrolet.pdf','PDF'],['02-base-completa-chevrolet.xlsx','Base completa','Una fila por reclamo, con categorías, indicadores y resumen con fórmulas.','${ASSET}/descargas/02-base-completa-chevrolet.xlsx','Excel'],['03-base-abierta-chevrolet.csv','Base abierta','Los mismos datos en formato abierto, UTF-8.','${ASSET}/descargas/03-base-abierta-chevrolet.csv','CSV'],['04-anexo-de-evidencia-chevrolet.pdf','Anexo de evidencia','40 reclamos seleccionados por patrón, con extracto y enlace a la fuente.','${ASSET}/descargas/04-anexo-de-evidencia-chevrolet.pdf','PDF'],['05-control-de-extraccion-chevrolet.xlsx','Control de extracción','Páginas, fichas leídas, inclusiones y exclusiones con su motivo.','${ASSET}/descargas/05-control-de-extraccion-chevrolet.xlsx','Excel']];`
  );

  html = html.replace(
    /let DL=null;[\s\S]*?Abrí la página en el navegador e intentá de nuevo\.'\)\}\}\);/,
    `$('msg').textContent='Informe, bases y anexos se abren desde esta misma página de UCU.';`
  );

  html = html.replace(
    '<a class="btn" href="https://ucu.org.ar">Ir a ucu.org.ar</a>',
    '<a class="btn" href="/reclamos/nuevo">Hacé tu denuncia en UCU</a>'
  );

  return html;
}

async function findChevroletId(db) {
  const snap = await db.collection('reclamos_empresas').get();
  const hits = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    const name = `${data.nombre || ''} ${data.nombreSearch || ''}`.toLowerCase();
    if (name.includes('chevrolet')) {
      hits.push({ id: Number(data.id || doc.id), nombre: data.nombre, cuit: data.cuit || null });
    }
  }
  hits.sort((a, b) => a.id - b.id);
  const ahorro = hits.find((h) => /ahorro/i.test(h.nombre)) || hits[0] || null;
  return { ahorro, hits };
}

async function main() {
  const raw = fs.readFileSync(RAW, 'utf8');
  const html = cleanHtml(raw);
  fs.mkdirSync(path.dirname(PUBLIC_HTML), { recursive: true });
  fs.writeFileSync(PUBLIC_HTML, html, 'utf8');
  console.log('HTML limpio', html.length, '→', PUBLIC_HTML);

  initFirebase();
  const db = admin.firestore();
  const { ahorro, hits } = await findChevroletId(db);
  console.log('Empresas Chevrolet en catálogo:', hits);
  console.log('Vinculada:', ahorro);

  const now = new Date().toISOString();
  const investigacion = {
    slug: SLUG,
    title: 'El ahorro entra puntual. Volver, vuelve cuando quiere la administradora.',
    excerpt:
      'Leímos los 1.016 reclamos contra Chevrolet en tuQuejaSuma y separamos los 712 de planes de ahorro. El primer motivo de queja no es el auto: es la plata que el ahorrista ya pagó y no le devuelven.',
    empresaNombre: ahorro?.nombre || 'Chevrolet S.A. de Ahorro',
    empresaId: ahorro?.id ?? null,
    memberName: 'Adrián Bengolea',
    aiName: 'Claude',
    originalUrl: 'https://claude.ai/artifact/WNYMZfd9XEBrYZ48Rk87Xa',
    html,
    isFullDocument: true,
    status: 'publish',
    publishedAt: now,
    modifiedAt: now,
  };

  await db.collection('investigaciones').doc(SLUG).set(investigacion);
  console.log('Publicada: /investigaciones/' + SLUG);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
