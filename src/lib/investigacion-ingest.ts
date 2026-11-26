import JSZip from 'jszip';
import { slugify } from '@/lib/slug';

const MAX_ZIP_BYTES = 40 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 80 * 1024 * 1024;
const MAX_FILES = 250;
const TEXT_EXTS = new Set(['.css', '.htm', '.html', '.js', '.mjs', '.svg', '.txt']);

export type InvestigacionPackedFile = {
  rel: string;
  bytes: number;
};

export type UnpackedInvestigacion = {
  html: string;
  htmlRel: string;
  files: Map<string, Buffer>;
  title: string;
  excerpt: string;
};

function posixRel(name: string): string | null {
  const rel = name.replaceAll('\\', '/').replace(/^\/+/, '');
  if (!rel || rel.endsWith('/')) return null;
  if (rel.includes('\0') || rel.split('/').some((part) => part === '.' || part === '..')) {
    return null;
  }
  if (rel.startsWith('__MACOSX/') || rel.includes('/__MACOSX/') || /(^|\/)\.DS_Store$/i.test(rel)) {
    return null;
  }
  return rel;
}

function stripSharedFolder(paths: string[]): Map<string, string> {
  if (paths.length < 2) return new Map(paths.map((path) => [path, path]));
  const first = paths[0].split('/')[0];
  const nested = paths.every((path) => path === first || path.startsWith(`${first}/`));
  const hasRootFile = paths.some((path) => !path.includes('/'));
  if (!nested || hasRootFile) return new Map(paths.map((path) => [path, path]));
  return new Map(paths.map((path) => [path, path.slice(first.length + 1)]));
}

function findHtmlRel(rels: string[]): string {
  const htmls = rels.filter((rel) => /\.html?$/i.test(rel));
  if (!htmls.length) {
    throw new Error('El zip no tiene un archivo .html. Tiene que incluir el index de la investigación.');
  }
  const ranked = [...htmls].sort((a, b) => {
    const aIndex = /(^|\/)index\.html?$/i.test(a) ? 0 : 1;
    const bIndex = /(^|\/)index\.html?$/i.test(b) ? 0 : 1;
    if (aIndex !== bIndex) return aIndex - bIndex;
    return a.split('/').length - b.split('/').length;
  });
  return ranked[0];
}

export function extractInvestigacionMeta(html: string): { title: string; excerpt: string } {
  const title =
    html
      .match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ?.replace(/<[^>]+>/g, '')
      .replace(/\s*\|\s*UCU\s*$/i, '')
      .trim() || '';
  const excerpt =
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i)?.[1]?.trim() ||
    '';
  return { title, excerpt };
}

function collectLocalRefs(text: string): string[] {
  const refs = new Set<string>();
  const add = (raw: string) => {
    const value = String(raw || '')
      .trim()
      .split(/[?#]/)[0];
    if (!value) return;
    if (/^(https?:|data:|mailto:|javascript:|#|\/\/)/i.test(value)) return;
    if (value.startsWith('/') || value.includes('${')) return;
    refs.add(value.replace(/^\.\//, ''));
  };
  for (const re of [
    /\b(?:src|href)=["']([^"']+)["']/gi,
    /fetch\(\s*['"]([^'"]+)['"]/gi,
    /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi,
  ]) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(text))) add(match[1]);
  }
  return [...refs];
}

export function stripClaudeRuntime(html: string): string {
  let out = html.replace(/<!-- frame-runtime -->[\s\S]*?<!-- \/frame-runtime -->/g, '');
  out = out.replace(/<script[^>]*>\s*window\.claude[\s\S]*?<\/script>/gi, '');
  out = out.replace(/if\(window\.claude&&window\.claude\.use\)\{[\s\S]*?\.catch\(\(\)=>\{\}\)\}/g, '');
  out = out.replace(/let DL=null;\s*/g, '');
  out = out.replace(
    /\$\('dl'\)\.addEventListener\('click',async e=>\{[\s\S]*?Abrí la página en el navegador e intentá de nuevo\.'\)\}\}\);/g,
    ''
  );
  out = out.replaceAll(
    '`<a class="btn" href="${f[3]}">Abrir ${f[4]}</a>`',
    '`<a class="btn" href="${f[3]}" target="_blank" rel="noopener">Abrir ${f[4]}</a>`'
  );
  return out;
}

function rewriteLocalRefs(text: string, slug: string, rels: string[]): string {
  const prefix = `/inv/${slug}`;
  let out = text;
  const sorted = [...rels].sort((a, b) => b.length - a.length);
  for (const rel of sorted) {
    const dest = `${prefix}/${rel}`;
    out = out.replaceAll(`"${rel}"`, `"${dest}"`);
    out = out.replaceAll(`'${rel}'`, `'${dest}'`);
    out = out.replaceAll(`"./${rel}"`, `"${dest}"`);
    out = out.replaceAll(`'./${rel}'`, `'${dest}'`);
    out = out.replaceAll(`url(${rel})`, `url(${dest})`);
    out = out.replaceAll(`url("${rel}")`, `url("${dest}")`);
    out = out.replaceAll(`url('${rel}')`, `url('${dest}')`);
  }
  return out;
}

function decodeB64Sidecars(files: Map<string, Buffer>) {
  for (const [rel, buffer] of [...files.entries()]) {
    if (!rel.endsWith('.b64.txt')) continue;
    const realRel = rel.replace(/\.b64\.txt$/i, '');
    if (files.has(realRel)) continue;
    files.set(realRel, Buffer.from(buffer.toString('utf8').trim(), 'base64'));
  }
}

export async function unpackInvestigacionZip(zipBuffer: Buffer): Promise<UnpackedInvestigacion> {
  if (zipBuffer.length > MAX_ZIP_BYTES) {
    throw new Error('El zip supera los 40 MB. Partilo o sacá archivos que no sean de la investigación.');
  }

  const zip = await JSZip.loadAsync(zipBuffer);
  const raw = new Map<string, Buffer>();
  let uncompressed = 0;

  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const rel = posixRel(name);
    if (!rel) continue;
    const buffer = await entry.async('nodebuffer');
    uncompressed += buffer.length;
    if (uncompressed > MAX_UNCOMPRESSED_BYTES) {
      throw new Error('El zip descomprimido supera los 80 MB.');
    }
    raw.set(rel, buffer);
    if (raw.size > MAX_FILES) {
      throw new Error('El zip tiene demasiados archivos (máximo 250).');
    }
  }

  if (!raw.size) {
    throw new Error('El zip está vacío.');
  }

  const renamed = stripSharedFolder([...raw.keys()]);
  const files = new Map<string, Buffer>();
  for (const [from, to] of renamed) {
    if (!to) continue;
    files.set(to, raw.get(from)!);
  }
  decodeB64Sidecars(files);

  const htmlRel = findHtmlRel([...files.keys()]);
  const html = stripClaudeRuntime(files.get(htmlRel)!.toString('utf8'));
  const meta = extractInvestigacionMeta(html);
  return { html, htmlRel, files, title: meta.title, excerpt: meta.excerpt };
}

export function rewriteInvestigacionBundle(
  unpacked: UnpackedInvestigacion,
  slug: string
): { html: string; assets: { rel: string; buffer: Buffer }[] } {
  const safeSlug = slugify(slug);
  if (!safeSlug) throw new Error('Falta una URL (slug) para guardar los archivos.');

  const assetRels = [...unpacked.files.keys()].filter((rel) => rel !== unpacked.htmlRel);
  const rewrittenFiles = new Map<string, Buffer>();

  for (const rel of assetRels) {
    const buffer = unpacked.files.get(rel)!;
    const ext = rel.slice(rel.lastIndexOf('.')).toLowerCase();
    if (TEXT_EXTS.has(ext)) {
      const text = rewriteLocalRefs(buffer.toString('utf8'), safeSlug, assetRels);
      rewrittenFiles.set(rel, Buffer.from(text, 'utf8'));
    } else {
      rewrittenFiles.set(rel, buffer);
    }
  }

  const html = rewriteLocalRefs(unpacked.html, safeSlug, assetRels);
  return {
    html,
    assets: [...rewrittenFiles.entries()].map(([rel, buffer]) => ({ rel, buffer })),
  };
}

export function suggestedSlugFromZipName(filename: string): string {
  return slugify(filename.replace(/\.zip$/i, '')) || 'investigacion';
}
