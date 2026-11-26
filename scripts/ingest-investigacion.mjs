#!/usr/bin/env node
/**
 * Toma una investigación completa (HTML + logos + JSON + PDF/Excel/CSV)
 * y la publica en UCU sin esperar un deploy del sitio.
 *
 * Los archivos van a Firebase Storage. El HTML, a Firestore.
 * Las URLs quedan en /inv/{slug}/… y las sirve la app con la misma cuenta
 * que el Observatorio de empresas.
 *
 * Uso:
 *   node scripts/ingest-investigacion.mjs --dir tmp/mi-investigacion --slug empresa-tema --title "…" --empresa "…"
 *   node scripts/ingest-investigacion.mjs --url https://ejemplo.org/informe.html --slug … --title … --empresa …
 *
 * Un link de Claude/Gemini casi nunca trae los binarios. Si el fetch no
 * baja PDF/Excel, pasá la carpeta exportada (index.html + descargas/ + datos/).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env.local') });

const TYPES = {
  '.csv': 'text/csv; charset=utf-8',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain; charset=utf-8',
};

function argValue(name, fallback = '') {
  const prefix = `--${name}=`;
  const hit = process.argv.find((item) => item.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1];
  }
  return fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function contentType(filename) {
  return TYPES[path.extname(filename).toLowerCase()] || 'application/octet-stream';
}

function initFirebase() {
  if (admin.apps.length) return admin.app();
  const bucketName =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'ucuweb-2887d.firebasestorage.app';
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath && fs.existsSync(credentialsPath)) {
    return admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))),
      storageBucket: bucketName,
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
    storageBucket: bucketName,
  });
}

function walkFiles(dir, base = dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkFiles(full, base));
    else out.push(path.relative(base, full).replaceAll('\\', '/'));
  }
  return out;
}

function collectLocalRefs(html) {
  const refs = new Set();
  const add = (raw) => {
    if (!raw) return;
    const value = String(raw).trim().split(/[?#]/)[0];
    if (!value) return;
    if (/^(https?:|data:|mailto:|javascript:|#|\/\/)/i.test(value)) return;
    if (value.startsWith('/') || value.includes('${')) return;
    refs.add(value.replace(/^\.\//, ''));
  };
  for (const re of [/\b(?:src|href)=["']([^"']+)["']/gi, /fetch\(\s*['"]([^'"]+)['"]/gi]) {
    let match;
    while ((match = re.exec(html))) add(match[1]);
  }
  return [...refs];
}

function stripClaudeRuntime(html) {
  let out = html.replace(/<!-- frame-runtime -->[\s\S]*?<!-- \/frame-runtime -->/g, '');
  out = out.replace(/<script[^>]*>\s*window\.claude[\s\S]*?<\/script>/gi, '');
  out = out.replace(/if\(window\.claude&&window\.claude\.use\)\{[\s\S]*?\.catch\(\(\)=>\{\}\)\}/g, '');
  out = out.replace(/let DL=null;\s*/g, '');
  out = out.replace(
    /\$\('dl'\)\.addEventListener\('click',async e=>\{[\s\S]*?Abrí la página en el navegador e intentá de nuevo\.'\)\}\}\);/g,
    ''
  );
  out = out.replace(
    '`<a class="btn" href="${f[3]}">Abrir ${f[4]}</a>`',
    '`<a class="btn" href="${f[3]}" target="_blank" rel="noopener">Abrir ${f[4]}</a>`'
  );
  return out;
}

function rewriteLocalRefs(html, slug, rels) {
  const prefix = `/inv/${slug}`;
  let out = html;
  const sorted = [...rels].sort((a, b) => b.length - a.length);
  for (const rel of sorted) {
    const dest = `${prefix}/${rel}`;
    out = out.replaceAll(`"${rel}"`, `"${dest}"`);
    out = out.replaceAll(`'${rel}'`, `'${dest}'`);
    out = out.replaceAll(`"./${rel}"`, `"${dest}"`);
    out = out.replaceAll(`'./${rel}'`, `'${dest}'`);
  }
  return out;
}

function looksLikeLoginPage(html) {
  const sample = html.slice(0, 4000).toLowerCase();
  return (
    sample.includes('content is user-generated') ||
    (sample.includes('sign in') && sample.includes('claude.ai')) ||
    (sample.includes('accounts.google.com') && html.length < 8000)
  );
}

async function fetchBuffer(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'UCU-investigaciones/1.0 (+https://ucu.org.ar)',
      accept: '*/*',
    },
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${url}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function findHtmlFile(dir) {
  const files = walkFiles(dir);
  const index = files.find((file) => /(^|\/)index\.html?$/i.test(file));
  if (index) return index;
  const htmls = files.filter((file) => /\.html?$/i.test(file));
  if (htmls.length === 1) return htmls[0];
  throw new Error('No encontré un index.html en la carpeta. Pasá --html=ruta');
}

async function loadFromUrl(url, workDir) {
  fs.mkdirSync(workDir, { recursive: true });
  const htmlBuf = await fetchBuffer(url);
  const html = htmlBuf.toString('utf8');
  if (looksLikeLoginPage(html) || html.trim().length < 200) {
    throw new Error(
      'Ese link no entrega la investigación completa (login o página vacía). Exportá el artefacto a una carpeta y usá --dir.'
    );
  }
  const htmlPath = path.join(workDir, 'index.html');
  fs.writeFileSync(htmlPath, html, 'utf8');

  const base = new URL(url);
  const refs = collectLocalRefs(html);
  const downloaded = [];
  for (const rel of refs) {
    const abs = new URL(rel, base).toString();
    if (new URL(abs).origin !== base.origin) continue;
    try {
      const buf = await fetchBuffer(abs);
      const dest = path.join(workDir, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);
      downloaded.push(rel);
    } catch (error) {
      console.warn('No se pudo bajar', rel, String(error.message || error));
    }
  }
  return { dir: workDir, htmlRel: 'index.html', downloaded };
}

function decodeB64Sidecars(dir, rels) {
  const created = [];
  for (const rel of rels) {
    if (!rel.endsWith('.b64.txt')) continue;
    const abs = path.join(dir, rel);
    if (!fs.existsSync(abs)) continue;
    const realRel = rel.replace(/\.b64\.txt$/i, '');
    const bin = Buffer.from(fs.readFileSync(abs, 'utf8').trim(), 'base64');
    const dest = path.join(dir, realRel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, bin);
    created.push(realRel);
    console.log('Decodificado', rel, '→', realRel, bin.length, 'bytes');
  }
  return created;
}

async function main() {
  const dryRun = hasFlag('dry-run');
  const slug = argValue('slug').trim();
  const title = argValue('title').trim();
  const empresa = argValue('empresa').trim();
  if (!slug || !title || !empresa) {
    throw new Error('Faltan --slug --title --empresa');
  }

  let dir = argValue('dir').trim() ? path.resolve(rootDir, argValue('dir').trim()) : '';
  const url = argValue('url').trim();
  let htmlRel = argValue('html').trim();

  if (url) {
    const workDir = path.join(rootDir, 'tmp', 'ingest', slug);
    const loaded = await loadFromUrl(url, workDir);
    dir = loaded.dir;
    htmlRel = loaded.htmlRel;
    console.log('Bajados desde URL:', loaded.downloaded.length, loaded.downloaded);
  } else if (!dir) {
    throw new Error('Pasá --dir carpeta o --url https://…');
  }

  if (!htmlRel) htmlRel = findHtmlFile(dir);
  const htmlAbs = path.isAbsolute(htmlRel) ? htmlRel : path.join(dir, htmlRel);
  if (!fs.existsSync(htmlAbs)) {
    throw new Error(`No está el HTML: ${htmlAbs}`);
  }

  const htmlRelPosix = path.relative(dir, htmlAbs).replaceAll('\\', '/');
  let html = stripClaudeRuntime(fs.readFileSync(htmlAbs, 'utf8'));
  const refs = new Set([...collectLocalRefs(html), ...walkFiles(dir).filter((file) => file !== htmlRelPosix)]);
  decodeB64Sidecars(dir, [...refs]).forEach((rel) => refs.add(rel));

  const assets = [...refs].filter((rel) => {
    const abs = path.join(dir, rel);
    return fs.existsSync(abs) && fs.statSync(abs).isFile();
  });
  html = rewriteLocalRefs(html, slug, assets);

  const missing = [...refs].filter((rel) => !assets.includes(rel) && !rel.endsWith('.b64.txt'));
  if (missing.length) {
    console.warn('Referencias sin archivo:', missing);
  }
  console.log('HTML', html.length, 'caracteres ·', assets.length, 'archivos');

  if (dryRun) {
    console.log(assets);
    return;
  }

  initFirebase();
  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  for (const rel of assets) {
    const abs = path.join(dir, rel);
    const buf = fs.readFileSync(abs);
    const storagePath = `investigaciones/${slug}/${rel}`;
    await bucket.file(storagePath).save(buf, {
      metadata: {
        contentType: contentType(rel),
        cacheControl: 'private, max-age=3600',
      },
    });
    const publicCopy = path.join(rootDir, 'public', 'inv', slug, rel);
    fs.mkdirSync(path.dirname(publicCopy), { recursive: true });
    fs.copyFileSync(abs, publicCopy);
    console.log('Subido', storagePath, buf.length);
  }

  const now = new Date().toISOString();
  const existing = await db.collection('investigaciones').doc(slug).get();
  const prev = existing.exists ? existing.data() : {};
  const investigacion = {
    slug,
    title,
    excerpt: argValue('excerpt', prev.excerpt || '').trim(),
    empresaNombre: empresa,
    empresaId: argValue('empresa-id') ? Number(argValue('empresa-id')) : prev.empresaId ?? null,
    memberName: argValue('member', prev.memberName || 'Adrián Bengolea').trim(),
    aiName: argValue('ai', prev.aiName || 'Claude').trim(),
    ctaLabel: argValue('cta', prev.ctaLabel || 'Abrir investigación').trim(),
    originalUrl: argValue('original', prev.originalUrl || url).trim() || undefined,
    html,
    isFullDocument: /<!doctype\s+html/i.test(html) || /<html[\s>]/i.test(html),
    status: argValue('status', prev.status || 'publish'),
    publishedAt: prev.publishedAt || now,
    modifiedAt: now,
  };
  if (!investigacion.originalUrl) delete investigacion.originalUrl;
  if (!Number.isFinite(investigacion.empresaId) || investigacion.empresaId <= 0) {
    investigacion.empresaId = null;
  }

  await db.collection('investigaciones').doc(slug).set(investigacion, { merge: true });
  console.log('Publicada: /investigaciones/' + slug);
  console.log('Archivos: /inv/' + slug + '/…');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
