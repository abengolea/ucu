#!/usr/bin/env node
/**
 * Publica el Observatorio Adelantos.com en /investigaciones/adelantos.
 * Arma la carpeta de ingestión, vincula o crea la empresa en reclamos_empresas
 * y deja HTML + bases en Storage / public/inv.
 *
 *   node scripts/publish-investigacion-adelantos.mjs
 *   node scripts/publish-investigacion-adelantos.mjs --dry-run
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

const SLUG = 'adelantos';
const CUIT = '30-71836767-7';
const CUIT_DIGITS = '30718367677';
const EMPRESA_NOMBRE = 'IXPAY S.A. (Adelantos.com)';
const EMPRESA_SEARCH =
  'adelantos adelantos.com adelantos com ixpay ixpay s.a. club adelantos adelantos pay';
const SOURCE_DIR = path.join(rootDir, 'tmp', 'observatorio-adelantos');
const STAGE_DIR = path.join(rootDir, 'tmp', 'adelantos-ingest');

const TITLE =
  'El préstamo trae un Club: 7.573 reclamos contra Adelantos.com';
const EXCERPT =
  'En tuQuejaSuma hay 7.573 denuncias contra Adelantos.com. Una de cada diez habla del Club Adelantos. En 118 respuestas la empresa admite una política: la suscripción iba incluida, hay que darla de baja aparte, o no se puede cancelar mientras haya deuda.';

const CTA_HTML = `
    <section class="cta-band" id="ayuda">
      <p class="eyebrow">¿Te pasó?</p>
      <h2>Si Adelantos te debitó el Club o no te deja dar la baja, no es un caso aislado.</h2>
      <p>Guardá comprobantes, mails y capturas de la app. La denuncia en UCU es gratuita.</p>
      <a class="button primary" href="/reclamos/nuevo" target="_top">Hacé tu denuncia en UCU</a>
    </section>
`;

const CTA_CSS = `
.cta-band { background: var(--blue); color: #fff; padding: clamp(3rem, 7vw, 5.5rem) clamp(1.1rem, 6vw, 7.5rem); }
.cta-band .eyebrow { color: var(--warning); margin-top: 0; }
.cta-band h2 { max-width: 22ch; margin: 0 0 1rem; color: #fff; font-size: clamp(2rem, 3.5vw, 3.2rem); line-height: 1.08; letter-spacing: -.03em; text-wrap: balance; }
.cta-band p { max-width: 66ch; margin: 0; font-family: Literata, Georgia, serif; color: rgba(255,255,255,.88); font-size: 1.08rem; line-height: 1.6; }
.cta-band .button.primary { margin-top: 1.4rem; background: #fff; color: var(--blue); }
.cta-band .button.primary:hover { transform: none; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .loading-bar span { animation: none; width: 100%; }
  tbody tr { transition: none; }
  .toggle > span, .toggle > span::after { transition: none; }
  .download-grid a { transition: none; }
  .download-grid a:hover { transform: none; }
}
`;

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

const INIT_OLD = `async function init() {
  try {
    const [claimsResponse, summaryResponse] = await Promise.all([
      fetch('/inv/adelantos/data/claims.json'),
      fetch('/inv/adelantos/data/summary.json'),
    ]);
    if (!claimsResponse.ok || !summaryResponse.ok) throw new Error('No se pudo cargar la base.');
    const [claims, summary] = await Promise.all([claimsResponse.json(), summaryResponse.json()]);
    state.summary = summary;
    state.claims = claims.map((claim) => ({ ...claim, _search: buildSearchIndex(claim) }));
    state.filtered = [...state.claims];
    fillSelect(fields.year, summary.yearly.map((x) => x.anio).sort().reverse());
    fillSelect(fields.category, state.claims.flatMap(allCategories));
    fillSelect(fields.product, state.claims.map((x) => x.producto_servicio));
    renderYearChart();
    renderCategoryChart();
    bindEvents();
    applyFilters(false);
  } catch (error) {
    $('#loadingScreen').innerHTML = \`<div class="loading-mark">!</div><p>\${escapeHtml(error.message)}</p>\`;
    return;
  }
  requestAnimationFrame(() => $('#loadingScreen').classList.add('hidden'));
}`;

const INIT_NEW = `async function init() {
  try {
    const summaryResponse = await fetch('/inv/adelantos/data/summary.json');
    if (!summaryResponse.ok) throw new Error('No se pudo cargar el resumen.');
    state.summary = await summaryResponse.json();
    fillSelect(fields.year, state.summary.yearly.map((x) => x.anio).sort().reverse());
    fillSelect(fields.category, state.summary.categories.map((x) => x.categoria));
    fillSelect(fields.product, (state.summary.products || []).map((x) => x.producto_servicio));
    renderYearChart();
    renderCategoryChart();
    bindEvents();
    requestAnimationFrame(() => $('#loadingScreen').classList.add('hidden'));
    $('#claimsBody').innerHTML = '<tr><td colspan="6">Cargando los 7.573 reclamos del explorador…</td></tr>';
    const claimsResponse = await fetch('/inv/adelantos/data/claims.json');
    if (!claimsResponse.ok) throw new Error('No se pudo cargar el explorador.');
    const claims = await claimsResponse.json();
    state.claims = claims.map((claim) => ({ ...claim, _search: buildSearchIndex(claim) }));
    state.filtered = [...state.claims];
    applyFilters(false);
  } catch (error) {
    const screen = $('#loadingScreen');
    if (screen && !screen.classList.contains('hidden')) {
      screen.innerHTML = \`<div class="loading-mark">!</div><p>\${escapeHtml(error.message)}</p>\`;
      return;
    }
    $('#claimsBody').innerHTML = \`<tr><td colspan="6">\${escapeHtml(error.message)}</td></tr>\`;
  }
}`;

function patchHtml(html) {
  let out = html.replace('lang="es"', 'lang="es-AR"');
  out = out.replace(
    'href="https://ucu.org.ar/" target="_blank" rel="noopener noreferrer"',
    'href="/" target="_top"'
  );
  out = out.replace(
    '<a class="nav-button" href="#descargas">Descargas</a>',
    '<a href="#descargas">Descargas</a>\n      <a class="nav-button" href="#ayuda">¿Te pasó?</a>'
  );
  out = out.replace(
    '<h1>Los reclamos, vistos como <em>un sistema</em>.</h1>',
    '<h1>El préstamo trae un Club.</h1>'
  );
  out = out.replace(
    '<p class="hero-lead">Relevamiento exhaustivo de todas las publicaciones disponibles en tuQuejaSuma sobre Adelantos.com. Una base navegable para identificar recurrencias, contrastar respuestas empresariales y seleccionar evidencia.</p>',
    `<p class="hero-lead">${EXCERPT}</p>`
  );
  out = out.replaceAll(' download>', ' target="_blank" rel="noopener">');
  out = out.replace(
    '<div class="finding-numbers"><span><b>110</b> dentro del universo Club</span><span><b>453</b> rechazos expresos</span></div>',
    `<div class="finding-numbers"><span><b>110</b> dentro del universo Club</span><span><b>453</b> rechazos expresos</span></div>
          <blockquote class="finding-quote">en ningún momento exponen a la vusta ese costo ni la suscripción, antes de aceptar.<cite>Reclamo <a href="https://tuquejasuma.com/adelantoscom/reclamos/cobro-indebido-y-enganoso-de-suscripcion" target="_blank" rel="noopener">3433198</a></cite></blockquote>`
  );
  if (!out.includes('id="ayuda"')) {
    out = out.replace('<footer>', `${CTA_HTML}\n  <footer>`);
  }
  out = out.replace(
    'Fecha de corte de datos: <strong>25 de noviembre de 2026</strong>. El sitio no se actualiza automáticamente.',
    'Observatorio UCU · Fuente: tuquejasuma.com/adelantoscom. Corte de datos: 25/11/2026. El sitio no se actualiza solo.'
  );
  out = out.replace(
    'Cargando la base completa de 7.573 reclamos…',
    'Cargando el observatorio…'
  );
  out = out.replace(
    '<svg viewBox="0 0 160 160" role="img" aria-label="Cobertura cien por ciento">',
    '<svg viewBox="0 0 160 160" width="220" height="220" role="img" aria-label="Cobertura cien por ciento">'
  );
  out = out.replace(
    '<circle cx="80" cy="80" r="67" class="ring-bg"></circle>',
    '<circle cx="80" cy="80" r="67" class="ring-bg" fill="none" stroke="rgba(255,255,255,.13)" stroke-width="9"></circle>'
  );
  out = out.replace(
    '<circle cx="80" cy="80" r="67" class="ring-value"></circle>',
    '<circle cx="80" cy="80" r="67" class="ring-value" fill="none" stroke="#e6007e" stroke-width="9" stroke-dasharray="421" stroke-linecap="round"></circle>'
  );
  if (!out.includes('fonts.googleapis.com')) {
    out = out.replace(
      '<title>Observatorio Adelantos.com | UCU</title>',
      `<title>Observatorio Adelantos.com | UCU</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800&family=Literata:ital,opsz,wght@0,7..72,400;1,7..72,400&display=swap" rel="stylesheet">`
    );
  }
  return out;
}

function patchCss(css) {
  let out = css.replace(
    'src: url("assets/archivo-2.woff2") format("woff2"); font-style: normal; font-weight: 400 900; font-display: swap; }',
    'src: url("assets/literata-latin-wght.woff2") format("woff2"); font-style: normal; font-weight: 400 900; font-display: swap; }'
  );
  if (!out.includes('.cta-band')) out += CTA_CSS;
  if (!out.includes('.finding-quote')) {
    out += `
.finding-quote { position: relative; z-index: 2; margin: 1.1rem 0 0; padding: 2px 0 2px 14px; border-left: 3px solid var(--cyan); font: italic 16px/1.6 Literata, Georgia, serif; color: #d5e7ee; }
.finding-quote cite { display: block; margin-top: 4px; font: 13px Archivo, system-ui, sans-serif; font-style: normal; color: rgba(255,255,255,.65); }
.finding-quote a { color: #fdb913; font-weight: 600; text-decoration: none; }
.finding-quote a:hover { text-decoration: underline; }
`;
  }
  return out;
}

function inlineCssAndJs(dir) {
  const htmlPath = path.join(dir, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  let css = fs.readFileSync(path.join(dir, 'styles.css'), 'utf8');
  const js = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
  css = css
    .replaceAll('url("assets/', 'url("/inv/adelantos/assets/')
    .replaceAll("url('assets/", "url('/inv/adelantos/assets/");
  html = html.replace(/<link rel="stylesheet" href="[^"]*styles\.css">/, () => `<style>\n${css}\n</style>`);
  html = html.replace(/<script src="[^"]*app\.js"[^>]*><\/script>/, () => `<script>\n${js}\n</script>`);
  fs.writeFileSync(htmlPath, html, 'utf8');
}

function stageFiles() {
  if (!fs.existsSync(path.join(SOURCE_DIR, 'index.html'))) {
    throw new Error(`No está el HTML de origen en ${SOURCE_DIR}`);
  }
  if (!fs.existsSync(path.join(SOURCE_DIR, 'data', 'claims.json'))) {
    throw new Error('Falta data/claims.json');
  }

  fs.rmSync(STAGE_DIR, { recursive: true, force: true });
  fs.cpSync(SOURCE_DIR, STAGE_DIR, { recursive: true });

  const htmlPath = path.join(STAGE_DIR, 'index.html');
  fs.writeFileSync(htmlPath, patchHtml(fs.readFileSync(htmlPath, 'utf8')), 'utf8');

  const cssPath = path.join(STAGE_DIR, 'styles.css');
  fs.writeFileSync(cssPath, patchCss(fs.readFileSync(cssPath, 'utf8')), 'utf8');

  const jsPath = path.join(STAGE_DIR, 'app.js');
  let js = fs
    .readFileSync(jsPath, 'utf8')
    .replaceAll("fetch('data/claims.json')", "fetch('/inv/adelantos/data/claims.json')")
    .replaceAll("fetch('data/summary.json')", "fetch('/inv/adelantos/data/summary.json')");
  if (js.includes(INIT_OLD)) js = js.replace(INIT_OLD, INIT_NEW);
  fs.writeFileSync(jsPath, js, 'utf8');

  inlineCssAndJs(STAGE_DIR);

  const whiteLogo = path.join(rootDir, 'public', 'inv', 'fenanjor', 'logo-ucu-white.png');
  const literata = path.join(rootDir, 'public', 'inv', 'fenanjor', 'fonts', 'literata-latin-wght.woff2');
  if (fs.existsSync(whiteLogo)) {
    fs.copyFileSync(whiteLogo, path.join(STAGE_DIR, 'assets', 'logo-ucu-white.png'));
  }
  if (fs.existsSync(literata)) {
    fs.copyFileSync(literata, path.join(STAGE_DIR, 'assets', 'literata-latin-wght.woff2'));
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
    if (
      digits === CUIT_DIGITS ||
      blob.includes('adelantos') ||
      blob.includes('ixpay')
    ) {
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
  const byName = hits.find((h) => /adelantos/i.test(`${h.nombre} ${h.nombreSearch}`));
  const existing = byCuit || byName || hits[0] || null;
  console.log('Empresas Adelantos/IXPAY en catálogo:', hits);

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
    syncSource: 'publish-investigacion-adelantos',
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
